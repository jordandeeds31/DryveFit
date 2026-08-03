import apiClient from "./client";
import { WorkoutLog } from "@/types/workoutLog.types";

export const logStandaloneWorkout = async (
  exercises: Array<{
    exerciseName: string;
    muscleGroup: string;
    sets: Array<{ weight: number | null; reps: number }>;
  }>,
  date: string,
) => {
  const { data } = await apiClient.post("/api/workout-logs", {
    exercises,
    date,
  });
  return data.result.workoutLog;
};

export const getWorkoutLogsForDate = async (
  date: string,
): Promise<WorkoutLog[]> => {
  const { data } = await apiClient.get(`/api/workout-logs?date=${date}`);
  return data.result.workoutLogs;
};

export const deleteWorkoutLogSet = async (
  exerciseLogId: string,
  setId: string,
) => {
  const { data } = await apiClient.delete(
    `/api/workout-logs/exercises/${exerciseLogId}/sets/${setId}`,
  );
  return data;
};
