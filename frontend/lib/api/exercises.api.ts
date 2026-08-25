import apiClient from "./client";
import { OneRepMaxEntry, PreviousSession } from "@/types/exercise.types";

export const getExercise1RMHistory = async (
  exerciseName: string,
): Promise<OneRepMaxEntry[]> => {
  const { data } = await apiClient.get(
    `/api/exercises/1rm-history?name=${encodeURIComponent(exerciseName)}`,
  );
  return data.result.history;
};

export const getPreviousSession = async (
  exerciseName: string,
  beforeDate?: string,
): Promise<PreviousSession | null> => {
  const params = new URLSearchParams({ name: exerciseName });
  if (beforeDate) params.set("before", beforeDate);

  const { data } = await apiClient.get(
    `/api/exercises/previous-session?${params.toString()}`,
  );
  return data.result.session;
};
