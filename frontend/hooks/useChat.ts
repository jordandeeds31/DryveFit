import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  getConversationMessages,
  sendChatMessage,
  deleteConversation,
  transcribeAudio,
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
      //
      // refetchType: "all" (not the default "active") because the screen
      // that actually shows this — Home/WorkoutLogger — is very often not
      // mounted while the user is off in the chat screen logging via the
      // AI coach. A plain invalidate would just mark that query stale and
      // leave it showing pre-log data until it happens to remount, i.e.
      // the user would have to pull-to-refresh to see what was just
      // logged. Refetching now, eagerly, means the cache is already
      // correct by the time they navigate over.
      queryClient.invalidateQueries({
        queryKey: ["workoutLogs"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["1rmHistory"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["schedule"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["streak"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["programDay"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["leaderboard"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["workingOutCount"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["previousSession"],
        refetchType: "all",
      });
      // Same reasoning, for log_food (chat.service.ts) instead of log_set.
      queryClient.invalidateQueries({
        queryKey: ["diary"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["dailyRecap"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["macroHistory"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["loggedDateKeys"],
        refetchType: "all",
      });
      // The profile screen's own month calendars (useUsers.ts) are
      // separate cache entries from the tab-level ones above — a log via
      // chat should update both the same way a manual log already does.
      queryClient.invalidateQueries({
        queryKey: ["publicNutritionHistory"],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["publicWorkoutHistory"],
        refetchType: "all",
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

export const useTranscribeAudio = () => {
  return useMutation({
    mutationFn: transcribeAudio,
  });
};
