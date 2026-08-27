import apiClient from "./client";
import {
  DiaryResponse,
  DailyRecap,
  FoodDetail,
  FoodSearchResults,
  FoodLogEntry,
  FoodLogSource,
  MacroEstimate,
  MacroHistoryBucket,
  MacroHistoryRange,
  NutritionProfile,
  MealType,
  ActivityLevel,
  NutritionGoalType,
} from "@/types/nutrition.types";

export const searchFood = async (query: string): Promise<FoodSearchResults> => {
  const { data } = await apiClient.get("/api/nutrition/search", {
    params: { query },
  });
  return data.result;
};

export const getFoodDetail = async (
  type: "common" | "branded",
  id: string,
): Promise<FoodDetail> => {
  const { data } = await apiClient.post("/api/nutrition/food-detail", {
    type,
    id,
  });
  return data.result;
};

export const logFood = async (input: {
  date: string;
  mealType: MealType;
  foodName: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source?: FoodLogSource;
}): Promise<FoodLogEntry> => {
  const { data } = await apiClient.post("/api/nutrition/log", input);
  return data.result.entry;
};

export const updateFoodLogEntry = async (
  entryId: string,
  input: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  },
): Promise<FoodLogEntry> => {
  const { data } = await apiClient.patch(
    `/api/nutrition/log/${entryId}`,
    input,
  );
  return data.result.entry;
};

export const deleteFoodLogEntry = async (entryId: string): Promise<void> => {
  await apiClient.delete(`/api/nutrition/log/${entryId}`);
};

export const estimateMacros = async (text: string): Promise<MacroEstimate> => {
  const { data } = await apiClient.post(
    "/api/nutrition/estimate-macros",
    { text },
    // AI estimation is a real LLM round trip — same reasoning as chat's
    // own timeout bump, not instant like the rest of this file's calls.
    { timeout: 20000 },
  );
  return data.result.estimate;
};

export const getDiary = async (date: string): Promise<DiaryResponse> => {
  const { data } = await apiClient.get("/api/nutrition/diary", {
    params: { date },
  });
  return data.result;
};

export const getDailyRecap = async (date: string): Promise<DailyRecap> => {
  const { data } = await apiClient.get("/api/nutrition/recap", {
    params: { date },
  });
  return data.result;
};

export const getMacroHistory = async (
  range: MacroHistoryRange,
): Promise<MacroHistoryBucket[]> => {
  const { data } = await apiClient.get("/api/nutrition/macro-history", {
    params: { range },
  });
  return data.result.history;
};

export const getLoggedDateKeys = async (
  startDate: string,
  endDate: string,
): Promise<string[]> => {
  const { data } = await apiClient.get("/api/nutrition/logged-dates", {
    params: { startDate, endDate },
  });
  return data.result.dateKeys;
};

export const getNutritionProfile = async (): Promise<NutritionProfile> => {
  const { data } = await apiClient.get("/api/nutrition/profile");
  return data.result.profile;
};

export const updateNutritionProfile = async (input: {
  gender: string;
  weightLbs: number;
  heightInches: number;
  age: number;
  activityLevel: ActivityLevel;
  goalType: NutritionGoalType;
}): Promise<NutritionProfile> => {
  const { data } = await apiClient.patch("/api/nutrition/profile", input);
  return data.result.profile;
};

export const updateNutritionGoal = async (input: {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}): Promise<NutritionProfile> => {
  const { data } = await apiClient.patch("/api/nutrition/goal", input);
  return data.result.profile;
};
