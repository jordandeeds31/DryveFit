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
  // RevenueCat's own entitlement check (same source of truth as every
  // other Pro gate in the app, e.g. requirePro.ts) — the backend has no
  // independent subscription record to check against, so this is trusted
  // the same way every other Pro gate in this app already trusts the
  // client.
  isPro: boolean;
}): Promise<{ message: ChatMessage; conversationId: string }> => {
  const { data } = await apiClient.post("/api/chat/messages", params);
  return data.result;
};

export const deleteConversation = async (
  conversationId: string,
): Promise<void> => {
  await apiClient.delete(`/api/chat/conversations/${conversationId}`);
};

export const transcribeAudio = async (audioUri: string): Promise<string> => {
  const formData = new FormData();
  formData.append("audio", {
    uri: audioUri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const { data } = await apiClient.post("/api/chat/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // Same reasoning as posts.api.ts's createPost — Whisper transcription
    // takes longer than the client's default JSON timeout.
    timeout: 30000,
  });
  return data.result.text;
};
