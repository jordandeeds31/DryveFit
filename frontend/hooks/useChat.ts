import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
} from "@/lib/api/chat.api";

export const useChatHistory = () => {
  return useQuery({
    queryKey: ["chatHistory"],
    queryFn: getChatHistory,
  });
};

export const useSendChatMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
  });
};

export const useClearChatHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearChatHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
  });
};
