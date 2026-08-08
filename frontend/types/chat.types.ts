export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
