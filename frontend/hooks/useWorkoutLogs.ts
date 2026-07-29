import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  logStandaloneWorkout,
  getWorkoutLogsForDate,
} from "@/lib/api/workoutLogs.api";

export const useLogStandaloneWorkout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exercises,
      date,
    }: {
      exercises: Array<{
        exerciseName: string;
        muscleGroup: string;
        sets: Array<{ weight: number; reps: number }>;
      }>;
      date: string;
    }) => logStandaloneWorkout(exercises, date),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workoutLogs", variables.date],
      });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
    },
  });
};

export const useWorkoutLogsForDate = (date: string) => {
  return useQuery({
    queryKey: ["workoutLogs", date],
    queryFn: () => getWorkoutLogsForDate(date),
  });
};
