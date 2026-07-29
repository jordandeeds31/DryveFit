import { useQuery } from "@tanstack/react-query";
import { getExercises, getExercise1RMHistory } from "@/lib/api/exercises.api";

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
