import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  getConversationMessages,
  sendChatMessage,
  deleteConversation,
} from "@/lib/api/chat.api";

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  });
};

// conversationId is undefined for a not-yet-started new chat — disabled
// rather than fetching, since there's nothing on the server for it yet.
export const useConversationMessages = (conversationId?: string) => {
  return useQuery({
    queryKey: ["conversationMessages", conversationId],
    queryFn: () => getConversationMessages(conversationId!),
    enabled: !!conversationId,
  });
};

export const useSendChatMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["conversationMessages", data.conversationId],
      });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
