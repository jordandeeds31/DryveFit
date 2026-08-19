import apiClient from "./client";
import {
  DmConversationListItem,
  DmMessage,
  DmMessagesPage,
} from "@/types/directMessages.types";

export const getDmConversations = async (): Promise<
  DmConversationListItem[]
> => {
  const { data } = await apiClient.get("/api/messages/conversations");
  return data.result.conversations;
};

export const createDmConversation = async (
  targetUserId: string,
): Promise<string> => {
  const { data } = await apiClient.post("/api/messages/conversations", {
    targetUserId,
  });
  return data.result.conversationId;
};

export const getDmMessages = async (
  conversationId: string,
  cursor?: string,
): Promise<DmMessagesPage> => {
  const { data } = await apiClient.get(
    `/api/messages/conversations/${conversationId}/messages`,
    { params: cursor ? { cursor } : undefined },
  );
  return data.result;
};

export const sendDmMessage = async (
  conversationId: string,
  content: string,
): Promise<DmMessage> => {
  const { data } = await apiClient.post(
    `/api/messages/conversations/${conversationId}/messages`,
    { content },
  );
  return data.result.message;
};

export const markDmConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.patch(`/api/messages/conversations/${conversationId}/read`);
};
