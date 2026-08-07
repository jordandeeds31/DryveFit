import apiClient from "./client";
import { CardioActivityType } from "@/types/cardio.types";
import {
  CardioLeaderboard,
  CardioLeaderboardCategory,
} from "@/types/cardioLeaderboard.types";

export const getCardioLeaderboard = async (
  activityType: CardioActivityType,
  category: CardioLeaderboardCategory,
  gender: "male" | "female",
): Promise<CardioLeaderboard> => {
  const params = new URLSearchParams({ activityType, category, gender });
  const { data } = await apiClient.get(
    `/api/cardio-leaderboard?${params.toString()}`,
  );
  return data.result.leaderboard;
};
