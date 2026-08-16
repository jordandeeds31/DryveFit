import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
} from "@tanstack/react-query";
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

// The calendar's green dot is driven by useLoggedDateKeys, which caches one
// query per (rangeStart, rangeEnd) window as the user pages between weeks —
// plain invalidateQueries only forces an immediate refetch of whichever
// window happens to be active right now, marking every other cached window
// merely "stale" (it'd only actually refetch the next time it becomes
// active again). refetchType: "all" instead forces every cached window to
// refetch immediately, so paging back to a week you already visited this
// session can't show a dot for a day whose last entry was just deleted (or
// miss one that was just added).
const invalidateLoggedDateKeys = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    queryKey: ["loggedDateKeys"],
    refetchType: "all",
  });

export const useLogFood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logFood,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["diary", variables.date] });
      queryClient.invalidateQueries({
        queryKey: ["dailyRecap", variables.date],
      });
      invalidateLoggedDateKeys(queryClient);
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
      invalidateLoggedDateKeys(queryClient);
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
