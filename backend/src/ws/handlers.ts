import { WebSocket } from "ws";
import prisma from "../lib/prisma";
import { broadcastToUser } from "./registry";
import { ClientMessage, DmMessagePayload, ServerMessage } from "./types";

// Capped so a client that's been offline a long time (days) can't pull an
// unbounded batch through a single WS frame — the client falls back to a
// normal REST refetch when `truncated` comes back true instead of trusting
// this reply as a complete history.
const SYNC_MAX_ROWS = 500;

// Defense-in-depth against a buggy/misbehaving client hammering
// typing:start on every keystroke instead of debouncing client-side —
// this only throttles the "start" chatter, "stop" always goes through so
// the indicator doesn't get stuck on.
const TYPING_THROTTLE_MS = 1000;
const lastTypingStartAt = new WeakMap<WebSocket, number>();

const toDmMessagePayload = (message: {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: Date;
}): DmMessagePayload => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  content: message.content,
  imageUrl: message.imageUrl,
  createdAt: message.createdAt.toISOString(),
});

const send = (socket: WebSocket, payload: ServerMessage): void => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const handleSync = async (
  socket: WebSocket,
  userId: string,
  since?: string,
): Promise<void> => {
  // >= not > — `since` is millisecond-precision (JS Date.toISOString())
  // while Postgres timestamps carry microsecond precision, so a strict `>`
  // can silently drop a message that landed in the same millisecond as the
  // client's last-seen one. Over-fetching by one row is harmless (the
  // client dedupes by id); under-fetching loses a message with no way to
  // recover it.
  const sinceDate = since ? new Date(since) : new Date(0);

  const rows = await prisma.dmMessage.findMany({
    where: {
      conversation: { participants: { some: { userId } } },
      createdAt: { gte: sinceDate },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: SYNC_MAX_ROWS + 1,
  });

  const truncated = rows.length > SYNC_MAX_ROWS;
  const page = truncated ? rows.slice(0, SYNC_MAX_ROWS) : rows;

  send(socket, {
    type: "sync:missed",
    messages: page.map(toDmMessagePayload),
    truncated,
  });
};

const handleTyping = async (
  socket: WebSocket,
  userId: string,
  type: "typing:start" | "typing:stop",
  conversationId: string,
): Promise<void> => {
  if (type === "typing:start") {
    const now = Date.now();
    const last = lastTypingStartAt.get(socket) ?? 0;
    if (now - last < TYPING_THROTTLE_MS) return;
    lastTypingStartAt.set(socket, now);
  }

  const participant = await prisma.dmParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: {
      conversation: {
        select: { participants: { select: { userId: true } } },
      },
    },
  });
  if (!participant) return;

  const otherParticipantIds = participant.conversation.participants
    .map((p) => p.userId)
    .filter((id) => id !== userId);

  for (const otherId of otherParticipantIds) {
    broadcastToUser(otherId, { type, conversationId, userId }, socket);
  }
};

export const handleClientMessage = async (
  socket: WebSocket,
  userId: string,
  raw: Buffer,
): Promise<void> => {
  let parsed: ClientMessage;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    return;
  }

  switch (parsed.type) {
    case "sync":
      await handleSync(socket, userId, parsed.since);
      return;
    case "typing:start":
    case "typing:stop":
      await handleTyping(socket, userId, parsed.type, parsed.conversationId);
      return;
    default:
      return;
  }
};
