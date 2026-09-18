import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSavedRecipes,
  getDiscoverRecipes,
  extractRecipeFromLink,
  saveRecipe,
  logSavedRecipeToMeal,
} from "@/lib/api/savedRecipes.api";

export const useSavedRecipes = () => {
  return useQuery({
    queryKey: ["savedRecipes"],
    queryFn: getSavedRecipes,
  });
};

export const useDiscoverRecipes = (query: string = "") => {
  return useQuery({
    queryKey: ["discoverRecipes", query],
    queryFn: () => getDiscoverRecipes(query),
  });
};

export const useExtractRecipeFromLink = () => {
  return useMutation({
    mutationFn: extractRecipeFromLink,
  });
};

export const useSaveRecipe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
      queryClient.invalidateQueries({ queryKey: ["discoverRecipes"] });
    },
  });
};

export const useLogSavedRecipeToMeal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logSavedRecipeToMeal,
    // Broad (dateless) invalidation, same pattern as the nutrition
    // profile/goal mutations in useNutrition.ts — this fires from the
    // Recipes screen, not the Nutrition screen, so there's no specific
    // date's diary query mounted right now to target precisely.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["diary"] });
      queryClient.invalidateQueries({ queryKey: ["dailyRecap"] });
      queryClient.invalidateQueries({ queryKey: ["macroHistory"] });
      queryClient.invalidateQueries({ queryKey: ["weightTrend"] });
      queryClient.invalidateQueries({ queryKey: ["loggedDateKeys"] });
    },
  });
};
