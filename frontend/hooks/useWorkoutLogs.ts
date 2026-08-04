import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  logStandaloneWorkout,
  getWorkoutLogsForDate,
  deleteWorkoutLogSet,
  deleteWorkoutLogsForDate,
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
        sets: Array<{ weight: number | null; reps: number }>;
      }>;
      date: string;
    }) => logStandaloneWorkout(exercises, date),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workoutLogs", variables.date],
      });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};

export const useWorkoutLogsForDate = (date: string) => {
  return useQuery({
    queryKey: ["workoutLogs", date],
    queryFn: () => getWorkoutLogsForDate(date),
  });
};

export const useDeleteWorkoutLogSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exerciseLogId,
      setId,
    }: {
      exerciseLogId: string;
      setId: string;
    }) => deleteWorkoutLogSet(exerciseLogId, setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};

export const useDeleteWorkoutLogsForDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteWorkoutLogsForDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};
