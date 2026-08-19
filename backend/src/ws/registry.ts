import { WebSocket } from "ws";
import { ServerMessage } from "./types";

// In-memory only — correct as long as this runs as a single Node process
// (Render Starter tier today: one instance, no autoscaling, no cluster).
//
// SCALABILITY NOTE: if Dryve ever moves to multiple Render instances, this
// registry stops being correct — a message sent to a user connected to
// instance B would never reach them if the sender's request landed on
// instance A, since each instance only knows about its own local sockets.
// The fix at that point is a shared pub/sub layer (e.g. Redis via
// `ioredis`) that every instance subscribes to, publishing message/typing/
// read events to a channel instead of writing directly to this local Map.
// Not needed today — just flagged here for when it becomes relevant.
const connectionsByUser = new Map<string, Set<WebSocket>>();

export const addConnection = (userId: string, socket: WebSocket): void => {
  const existing = connectionsByUser.get(userId);
  if (existing) {
    existing.add(socket);
    return;
  }
  connectionsByUser.set(userId, new Set([socket]));
};

export const removeConnection = (userId: string, socket: WebSocket): void => {
  const sockets = connectionsByUser.get(userId);
  if (!sockets) return;
  sockets.delete(socket);
  if (sockets.size === 0) {
    connectionsByUser.delete(userId);
  }
};

export const isUserConnected = (userId: string): boolean =>
  (connectionsByUser.get(userId)?.size ?? 0) > 0;

// excludeSocket lets a sender's own connection skip a message it already
// knows about (it gets the definitive row back from the REST response
// instead) while still reaching that same user's OTHER devices, if any.
export const broadcastToUser = (
  userId: string,
  payload: ServerMessage,
  excludeSocket?: WebSocket,
): void => {
  const sockets = connectionsByUser.get(userId);
  if (!sockets) return;

  const serialized = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket === excludeSocket) continue;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(serialized);
    }
  }
};
