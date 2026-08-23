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
      // The AI coach can log sets via its log_workout_sets/log_program_exercise
      // tools (see chat.service.ts) — invalidated unconditionally rather
      // than only when a tool was actually called, since that's cheap
      // (just marks these stale for the next mount/focus) and avoids
      // threading a "did this message write anything" flag through the API
      // just for this. Mirrors the exact query keys useWorkoutLogs.ts and
      // usePrograms.ts invalidate after their own manual-logging mutations,
      // since an AI-driven log can touch either write path.
      queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["workingOutCount"] });
      queryClient.invalidateQueries({ queryKey: ["previousSession"] });
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
