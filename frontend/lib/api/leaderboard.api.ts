import apiClient from "./client";
import { Leaderboard } from "@/types/leaderboard.types";
import { Exercise } from "@/types/exercise.types";

export const getLeaderboard = async (
  exerciseName: string,
  scope: "city" | "global",
  gender: "male" | "female",
): Promise<Leaderboard> => {
  const params = new URLSearchParams({ exerciseName, scope, gender });
  const { data } = await apiClient.get(
    `/api/leaderboard?${params.toString()}`,
  );
  return data.result.leaderboard;
};

// Used to default the Leaderboard screen to a populated ranking instead of
// an empty "pick an exercise" state. Returns null if nobody has logged a
// qualifying set for any exercise yet.
export const getPopularExercise = async (): Promise<Exercise | null> => {
  const { data } = await apiClient.get("/api/leaderboard/popular-exercise");
  return data.result.exercise;
};
