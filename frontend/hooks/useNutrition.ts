import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  searchFood,
  getFoodDetail,
  logFood,
  deleteFoodLogEntry,
  getDiary,
  getDailyRecap,
  getLoggedDateKeys,
  getNutritionProfile,
  updateNutritionProfile,
  updateNutritionGoal,
} from "@/lib/api/nutrition.api";

export const useFoodSearch = (query: string) => {
  return useQuery({
    queryKey: ["foodSearch", query],
    queryFn: () => searchFood(query),
    enabled: query.trim().length > 1,
    // Typeahead results go stale instantly anyway — no point caching
    // beyond the current keystroke session.
    staleTime: 0,
  });
};

export const useFoodDetail = () => {
  return useMutation({
    mutationFn: ({ type, id }: { type: "common" | "branded"; id: string }) =>
      getFoodDetail(type, id),
  });
};

export const useDiary = (date: string) => {
  return useQuery({
    queryKey: ["diary", date],
    queryFn: () => getDiary(date),
  });
};

export const useDailyRecap = (date: string) => {
  return useQuery({
    queryKey: ["dailyRecap", date],
    queryFn: () => getDailyRecap(date),
  });
};

export const useLoggedDateKeys = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ["loggedDateKeys", startDate, endDate],
    queryFn: () => getLoggedDateKeys(startDate, endDate),
  });
};

export const useLogFood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logFood,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["diary", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["dailyRecap", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["loggedDateKeys"] });
    },
  });
};

export const useDeleteFoodLogEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFoodLogEntry,
    onSuccess: () => {
      // The entry's date isn't known here without threading it through —
      // invalidating every cached diary/recap day is cheap and simple
      // given how few days are realistically cached at once.
      queryClient.invalidateQueries({ queryKey: ["diary"] });
      queryClient.invalidateQueries({ queryKey: ["dailyRecap"] });
      queryClient.invalidateQueries({ queryKey: ["loggedDateKeys"] });
    },
  });
};

export const useNutritionProfile = () => {
  return useQuery({
    queryKey: ["nutritionProfile"],
    queryFn: getNutritionProfile,
  });
};

export const useUpdateNutritionProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNutritionProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritionProfile"] });
      queryClient.invalidateQueries({ queryKey: ["diary"] });
    },
  });
};

export const useUpdateNutritionGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNutritionGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutritionProfile"] });
      queryClient.invalidateQueries({ queryKey: ["diary"] });
    },
  });
};
