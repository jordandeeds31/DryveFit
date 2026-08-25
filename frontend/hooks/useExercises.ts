import { useQuery } from "@tanstack/react-query";
import { getExercise1RMHistory, getPreviousSession } from "@/lib/api/exercises.api";
import { EXERCISES } from "@/constants/exercises";
import { Exercise } from "@/types/exercise.types";

// The catalog is bundled with the app (constants/exercises.ts) instead of
// fetched — it's ~80 static rows that never change at runtime, so there's
// no reason to depend on the network for it at all. That also fixes the
// intermittent "no exercises found" on mobile data: that was React Query
// resolving to an empty/errored state on a slow or dropped request, not a
// rendering/virtualization issue (DropdownExerciseSelect's list is a plain
// ScrollView over ~80 rows max — nowhere near enough to need windowing).
//
// Keeps the same { data, isLoading } shape both callers already destructure
// so neither needed to change.
export const useExercises = (): {
  data: Exercise[];
  isLoading: false;
} => {
  return { data: EXERCISES, isLoading: false };
};

export const use1RMHistory = (exerciseName: string | null) => {
  return useQuery({
    queryKey: ["1rmHistory", exerciseName],
    queryFn: () => getExercise1RMHistory(exerciseName!),
    enabled: !!exerciseName,
  });
};

// Also used eagerly (enabled: true) to decide whether the "Check Previous
// Workout" button should render at all — no button when there's no prior
// session for the exercise.
export const usePreviousSession = (
  exerciseName: string | null,
  beforeDate: string | undefined,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ["previousSession", exerciseName, beforeDate],
    queryFn: () => getPreviousSession(exerciseName!, beforeDate),
    enabled: !!exerciseName && enabled,
  });
};
