import { useQuery } from "@tanstack/react-query";
import { getExercises } from "@/lib/api/exercises.api";

export const useExercises = () => {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: getExercises,
  });
};
