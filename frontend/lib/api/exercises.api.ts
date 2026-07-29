import apiClient from "./client";
import { Exercise, OneRepMaxEntry } from "@/types/exercise.types";

export const getExercises = async (): Promise<Exercise[]> => {
  const { data } = await apiClient.get("/api/exercises");
  return data.result.exercises;
};

export const getExercise1RMHistory = async (
  exerciseName: string,
): Promise<OneRepMaxEntry[]> => {
  const { data } = await apiClient.get(
    `/api/exercises/1rm-history?name=${encodeURIComponent(exerciseName)}`,
  );
  return data.result.history;
};
