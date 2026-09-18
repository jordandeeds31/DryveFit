import apiClient from "./client";
import {
  SavedRecipe,
  ExtractedRecipe,
  ExtractRecipeOutcome,
} from "@/types/savedRecipes.types";
import { MealType, FoodLogEntry } from "@/types/nutrition.types";

export const getSavedRecipes = async (): Promise<SavedRecipe[]> => {
  const { data } = await apiClient.get("/api/saved-recipes");
  return data.result.recipes;
};

// The community feed — every user's saved imports, already deduped
// server-side to one card per unique source video (see
// getDiscoverRecipes in recipeImport.service.ts). query matches against
// both the title and LLM-generated concept tags (cuisine, main
// ingredients, diet, meal type), so e.g. "italian" finds a recipe whose
// title never says the word — run server-side so it reaches the whole
// community catalog, not just whatever page is already loaded.
export const getDiscoverRecipes = async (query?: string): Promise<SavedRecipe[]> => {
  const { data } = await apiClient.get("/api/saved-recipes/discover", {
    params: query ? { q: query } : undefined,
  });
  return data.result.recipes;
};

export const extractRecipeFromLink = async (
  url: string,
): Promise<ExtractRecipeOutcome> => {
  const { data } = await apiClient.post(
    "/api/saved-recipes/extract",
    { url },
    // A caption fetch plus an LLM call, not an instant round trip — same
    // reasoning as the other AI-backed endpoints in this app.
    { timeout: 30000 },
  );

  if (data.code === "RECIPE_NOT_DETECTED") {
    return { status: "no_recipe_detected", captionPreview: data.result.captionPreview };
  }
  if (data.code === "RECIPE_ALREADY_SAVED") {
    return { status: "already_saved", recipe: data.result.recipe };
  }
  return { status: "ready_to_review", recipe: data.result.recipe };
};

export const saveRecipe = async (input: ExtractedRecipe): Promise<SavedRecipe> => {
  const { data } = await apiClient.post("/api/saved-recipes", input);
  return data.result.recipe;
};

export const logSavedRecipeToMeal = async (input: {
  recipeId: string;
  mealType: MealType;
  date: string;
}): Promise<FoodLogEntry> => {
  const { data } = await apiClient.post(
    `/api/saved-recipes/${input.recipeId}/log`,
    { mealType: input.mealType, date: input.date },
    // A macro-estimation LLM call, same reasoning as extractRecipeFromLink.
    { timeout: 30000 },
  );
  return data.result.entry;
};
