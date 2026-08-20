import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  logStandaloneWorkout,
  getWorkoutLogsForDate,
  deleteWorkoutLogSet,
  deleteWorkoutLogsForDate,
} from "@/lib/api/workoutLogs.api";
import { saveStrengthWorkoutToHealthKit } from "@/lib/health/healthkit";

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
      queryClient.invalidateQueries({ queryKey: ["workingOutCount"] });
      queryClient.invalidateQueries({ queryKey: ["previousSession"] });

      const userId = queryClient.getQueryData<{ id: string }>([
        "currentUser",
      ])?.id;
      if (userId) {
        const setCount = variables.exercises.reduce(
          (sum, exercise) => sum + exercise.sets.length,
          0,
        );
        saveStrengthWorkoutToHealthKit(userId, {
          date: variables.date,
          setCount,
        }).catch(() => {});
      }
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
      queryClient.invalidateQueries({ queryKey: ["workingOutCount"] });
      queryClient.invalidateQueries({ queryKey: ["previousSession"] });
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
      queryClient.invalidateQueries({ queryKey: ["workingOutCount"] });
      queryClient.invalidateQueries({ queryKey: ["previousSession"] });
    },
  });
};
