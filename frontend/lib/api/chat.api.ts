import apiClient from "./client";
import { ChatMessage, Conversation } from "@/types/chat.types";

export const getConversations = async (): Promise<Conversation[]> => {
  const { data } = await apiClient.get("/api/chat/conversations");
  return data.result.conversations;
};

export const getConversationMessages = async (
  conversationId: string,
): Promise<ChatMessage[]> => {
  const { data } = await apiClient.get(
    `/api/chat/conversations/${conversationId}/messages`,
  );
  return data.result.messages;
};

export const sendChatMessage = async (params: {
  content: string;
  conversationId?: string;
}): Promise<{ message: ChatMessage; conversationId: string }> => {
  const { data } = await apiClient.post("/api/chat/messages", params);
  return data.result;
};

export const deleteConversation = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.delete(`/api/chat/conversations/${conversationId}`);
};
