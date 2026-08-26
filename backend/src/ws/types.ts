// Mirrored by hand in frontend/types/directMessages.types.ts — this repo
// has no shared-package/monorepo tooling between backend/ and frontend/,
// so there's no way to literally share these types. Keep both sides in
// sync manually; this file is the source of truth for the wire shape.

export interface DmMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
}

// --- Client -> server ---

export interface ClientAuthMessage {
  type: "auth";
  token: string;
}

export interface ClientSyncMessage {
  type: "sync";
  // ISO timestamp of the most recent message the client has already seen,
  // across all of its conversations. Omitted on a client's very first
  // connection (nothing seen yet).
  since?: string;
}

export interface ClientTypingMessage {
  type: "typing:start" | "typing:stop";
  conversationId: string;
}

export type ClientMessage =
  | ClientAuthMessage
  | ClientSyncMessage
  | ClientTypingMessage;

// --- Server -> client ---

export interface ServerAuthOkMessage {
  type: "auth:ok";
}

export interface ServerAuthErrorMessage {
  type: "auth:error";
  reason: string;
}

export interface ServerSyncMissedMessage {
  type: "sync:missed";
  messages: DmMessagePayload[];
  // True if the replay was capped (SYNC_MAX_ROWS in handlers.ts) — the
  // client should fall back to a normal REST refetch of its conversation
  // list/threads instead of trusting this batch as complete.
  truncated: boolean;
}

export interface ServerMessageNewEvent {
  type: "message:new";
  message: DmMessagePayload;
}

export interface ServerReadReceiptEvent {
  type: "read:receipt";
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
}

export interface ServerTypingEvent {
  type: "typing:start" | "typing:stop";
  conversationId: string;
  userId: string;
}

export type ServerMessage =
  | ServerAuthOkMessage
  | ServerAuthErrorMessage
  | ServerSyncMissedMessage
  | ServerMessageNewEvent
  | ServerReadReceiptEvent
  | ServerTypingEvent;

// Reserved WS close codes for this connection (application range starts at
// 4000 per RFC 6455) — kept distinct from the default 1000/1006 the client
// otherwise sees, so the reconnect logic can tell "you gave a bad/missing
// token" apart from an ordinary dropped connection.
export const WS_CLOSE_AUTH_TIMEOUT = 4001;
export const WS_CLOSE_AUTH_INVALID = 4002;
