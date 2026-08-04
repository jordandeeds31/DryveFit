import apiClient from "./client";
import { Leaderboard } from "@/types/leaderboard.types";

export const getLeaderboard = async (
  exerciseName: string,
  scope: "city" | "global",
): Promise<Leaderboard> => {
  const params = new URLSearchParams({ exerciseName, scope });
  const { data } = await apiClient.get(
    `/api/leaderboard?${params.toString()}`,
  );
  return data.result.leaderboard;
};
