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
    onSuccess: (data, variables) => {
      // Writes the real result straight into the cache instead of just
      // invalidating and waiting on a refetch — invalidate alone leaves a
      // window (variable, network-dependent — the "sometimes" in "it says
      // Log Workout, then later shows the logged workout") where Home
      // still renders the OLD (pre-log, empty) cached array while the
      // background refetch is in flight, since isLoading only reflects
      // "no data at all", not "this data is stale". logStandaloneWorkout
      // always fully replaces the day, so its response IS the complete,
      // correct array for this date — no round-trip needed to know that.
      queryClient.setQueryData(["workoutLogs", variables.date], [data]);
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
