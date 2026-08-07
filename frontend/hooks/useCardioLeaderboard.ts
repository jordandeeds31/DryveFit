import { useQuery } from "@tanstack/react-query";
import { getCardioLeaderboard } from "@/lib/api/cardioLeaderboard.api";
import { CardioActivityType } from "@/types/cardio.types";
import { CardioLeaderboardCategory } from "@/types/cardioLeaderboard.types";

export const useCardioLeaderboard = (
  activityType: CardioActivityType,
  category: CardioLeaderboardCategory,
  gender: "male" | "female",
) => {
  return useQuery({
    queryKey: ["cardioLeaderboard", activityType, category, gender],
    queryFn: () => getCardioLeaderboard(activityType, category, gender),
    // Rankings change any time someone (else) finishes a session — same
    // reasoning as useLeaderboard, always refetch rather than show a stale
    // snapshot from whenever this exact combination was last viewed.
    staleTime: 0,
    refetchOnMount: "always",
  });
};
