import apiClient from "./client";
import { ChatMessage } from "@/types/chat.types";

export const getChatHistory = async (): Promise<ChatMessage[]> => {
  const { data } = await apiClient.get("/api/chat");
  return data.result.messages;
};

export const sendChatMessage = async (
  content: string,
): Promise<ChatMessage> => {
  const { data } = await apiClient.post("/api/chat", { content });
  return data.result.message;
};

export const clearChatHistory = async (): Promise<void> => {
  await apiClient.delete("/api/chat");
};
