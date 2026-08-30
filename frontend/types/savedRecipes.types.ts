export interface SavedRecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface SavedRecipe {
  id: string;
  title: string;
  ingredients: SavedRecipeIngredient[];
  steps: string[];
  source: string;
  sourcePlatform: string | null;
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  // Estimated once at save time and cached — see logSavedRecipeToMeal in
  // recipeImport.service.ts. Null only for a recipe whose save-time
  // estimate failed and hasn't been backfilled yet (happens lazily on
  // first "add to meal").
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  createdAt: string;
}

// Not yet saved — returned by the extract step for the user to review
// (and edit) before saveRecipe persists it.
export interface ExtractedRecipe {
  title: string;
  ingredients: SavedRecipeIngredient[];
  steps: string[];
  sourcePlatform: "tiktok" | "youtube";
  sourceUrl: string;
  thumbnailUrl: string | null;
}

export type ExtractRecipeOutcome =
  | { status: "ready_to_review"; recipe: ExtractedRecipe }
  | { status: "already_saved"; recipe: SavedRecipe }
  | { status: "no_recipe_detected"; captionPreview: string };
