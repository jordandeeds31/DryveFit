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
