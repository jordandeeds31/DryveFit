// Mirrored by hand from backend/src/ws/types.ts and
// backend/src/modules/messages/ — this repo has no shared-package/monorepo
// tooling between frontend/ and backend/, so there's no way to literally
// share these types. Keep both sides in sync manually.

export interface DmOtherUser {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
}

export interface DmMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface DmConversationListItem {
  id: string;
  updatedAt: string;
  otherUser: DmOtherUser | null;
  lastMessage: {
    content: string;
    createdAt: string;
    isOwnMessage: boolean;
  } | null;
  unreadCount: number;
}

export interface DmMessagesPage {
  messages: DmMessage[];
  nextCursor: string | null;
}

// --- WebSocket payloads (mirrors backend/src/ws/types.ts's ServerMessage) ---

export interface WsAuthOkMessage {
  type: "auth:ok";
}

export interface WsAuthErrorMessage {
  type: "auth:error";
  reason: string;
}

export interface WsSyncMissedMessage {
  type: "sync:missed";
  messages: DmMessage[];
  truncated: boolean;
}

export interface WsMessageNewEvent {
  type: "message:new";
  message: DmMessage;
}

export interface WsReadReceiptEvent {
  type: "read:receipt";
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
}

export interface WsTypingEvent {
  type: "typing:start" | "typing:stop";
  conversationId: string;
  userId: string;
}

export type WsServerMessage =
  | WsAuthOkMessage
  | WsAuthErrorMessage
  | WsSyncMissedMessage
  | WsMessageNewEvent
  | WsReadReceiptEvent
  | WsTypingEvent;

export type WsConnectionStatus =
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed";
