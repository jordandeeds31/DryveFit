import apiClient from "./client";
import { Exercise } from "@/types/exercise.types";

export const getExercises = async (): Promise<Exercise[]> => {
  const { data } = await apiClient.get("/api/exercises");
  return data.result.exercises;
};
