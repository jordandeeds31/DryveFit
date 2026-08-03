import { useQuery } from "@tanstack/react-query";
import {
  getExercises,
  getExercise1RMHistory,
  getPreviousSession,
} from "@/lib/api/exercises.api";

export const useExercises = () => {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });
};

export const use1RMHistory = (exerciseName: string | null) => {
  return useQuery({
    queryKey: ["1rmHistory", exerciseName],
    queryFn: () => getExercise1RMHistory(exerciseName!),
    enabled: !!exerciseName,
  });
};

// Only fetched once the user actually opens the "Check Previous Workout"
// view — enabled is driven by that modal's visibility, not just having a
// name, so we don't fire this on every exercise selection.
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
