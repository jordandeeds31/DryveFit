import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/api/leaderboard.api";

export const useLeaderboard = (
  exerciseName: string | null,
  scope: "city" | "global",
) => {
  return useQuery({
    queryKey: ["leaderboard", exerciseName, scope],
    queryFn: () => getLeaderboard(exerciseName!, scope),
    enabled: !!exerciseName,
  });
};
