import apiClient from "./client";
import { SavedRecipe, ImportRecipeOutcome } from "@/types/savedRecipes.types";

export const getSavedRecipes = async (): Promise<SavedRecipe[]> => {
  const { data } = await apiClient.get("/api/saved-recipes");
  return data.result.recipes;
};

export const importRecipeFromLink = async (
  url: string,
): Promise<ImportRecipeOutcome> => {
  const { data } = await apiClient.post(
    "/api/saved-recipes/import",
    { url },
    // A caption fetch plus an LLM call, not an instant round trip — same
    // reasoning as the other AI-backed endpoints in this app.
    { timeout: 30000 },
  );

  if (data.code === "RECIPE_NOT_DETECTED") {
    return { status: "no_recipe_detected", captionPreview: data.result.captionPreview };
  }
  return { status: "saved", recipe: data.result.recipe };
};
