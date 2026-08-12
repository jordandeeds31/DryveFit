export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
