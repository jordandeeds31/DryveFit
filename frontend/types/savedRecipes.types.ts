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
  importedByUsername: string | null;
  createdAt: string;
}

export type ImportRecipeOutcome =
  | { status: "saved"; recipe: SavedRecipe }
  | { status: "no_recipe_detected"; captionPreview: string };
