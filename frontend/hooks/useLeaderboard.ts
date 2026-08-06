import { useQuery } from "@tanstack/react-query";
import { getLeaderboard, getPopularExercise } from "@/lib/api/leaderboard.api";

export const useLeaderboard = (
  exerciseName: string | null,
  scope: "city" | "global",
  gender: "male" | "female",
) => {
  return useQuery({
    queryKey: ["leaderboard", exerciseName, scope, gender],
    queryFn: () => getLeaderboard(exerciseName!, scope, gender),
    enabled: !!exerciseName,
    // Rankings change any time someone (else) logs or deletes a set —
    // the global 5-min staleTime is too stale for this screen. Always
    // treat cached results as stale so switching scope/exercise (or just
    // revisiting the tab) refetches instead of showing a snapshot from
    // whenever this exact combination was last viewed.
    staleTime: 0,
    refetchOnMount: "always",
  });
};

// Backs the Leaderboard screen's default exercise selection so it always
// opens on a populated ranking instead of an empty "pick an exercise" state.
export const usePopularExercise = () => {
  return useQuery({
    queryKey: ["popularExercise"],
    queryFn: getPopularExercise,
  });
};
