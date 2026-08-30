import apiClient from "./client";
import {
  RecipeSearchResult,
  RecipeSearchFilters,
  RecipeDetail,
  RecipePriceBreakdown,
} from "@/types/recipes.types";

export const searchRecipes = async (
  filters: RecipeSearchFilters,
): Promise<RecipeSearchResult[]> => {
  const { data } = await apiClient.get("/api/recipes/search", {
    params: {
      query: filters.query,
      cuisine: filters.cuisine,
      diet: filters.diet,
      mealType: filters.mealType,
      sort: filters.sort,
    },
  });
  return data.result.results;
};

export const getRecipeDetail = async (id: number): Promise<RecipeDetail> => {
  const { data } = await apiClient.get(`/api/recipes/${id}`);
  return data.result.recipe;
};

export const getRecipePriceBreakdown = async (
  id: number,
): Promise<RecipePriceBreakdown> => {
  const { data } = await apiClient.get(`/api/recipes/${id}/price-breakdown`);
  return data.result.breakdown;
};
