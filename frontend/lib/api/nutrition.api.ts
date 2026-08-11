import apiClient from "./client";
import {
  DiaryResponse,
  FoodDetail,
  FoodSearchResults,
  FoodLogEntry,
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
}): Promise<FoodLogEntry> => {
  const { data } = await apiClient.post("/api/nutrition/log", input);
  return data.result.entry;
};

export const deleteFoodLogEntry = async (entryId: string): Promise<void> => {
  await apiClient.delete(`/api/nutrition/log/${entryId}`);
};

export const getDiary = async (date: string): Promise<DiaryResponse> => {
  const { data } = await apiClient.get("/api/nutrition/diary", {
    params: { date },
  });
  return data.result;
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
  birthdate: string;
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
