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
  imageUri?: string,
): Promise<DmMessage> => {
  if (!imageUri) {
    const { data } = await apiClient.post(
      `/api/messages/conversations/${conversationId}/messages`,
      { content },
    );
    return data.result.message;
  }

  const formData = new FormData();
  if (content) {
    formData.append("content", content);
  }
  formData.append("image", {
    uri: imageUri,
    name: "message.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const { data } = await apiClient.post(
    `/api/messages/conversations/${conversationId}/messages`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      // Same reasoning as posts.api.ts's createPost — an image upload on a
      // slow connection can easily outrun the client's default JSON timeout.
      timeout: 60000,
    },
  );
  return data.result.message;
};

export const markDmConversationRead = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.patch(`/api/messages/conversations/${conversationId}/read`);
};
