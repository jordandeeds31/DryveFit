import {
  searchRecipes as spoonacularSearchRecipes,
  getRecipeInformation,
  getRecipePriceBreakdown as spoonacularGetPriceBreakdown,
  RecipeSearchFilters,
} from "../../lib/spoonacular";

const INGREDIENT_IMAGE_BASE_URL =
  "https://img.spoonacular.com/ingredients_100x100/";

const toIngredientImageUrl = (image?: string): string | null =>
  image ? `${INGREDIENT_IMAGE_BASE_URL}${image}` : null;

export interface RecipeSearchResult {
  id: number;
  title: string;
  imageUrl: string | null;
}

export type { RecipeSearchFilters };

export const searchRecipes = async (
  filters: RecipeSearchFilters,
): Promise<RecipeSearchResult[]> => {
  const results = await spoonacularSearchRecipes(filters);
  return results.map((result) => ({
    id: result.id,
    title: result.title,
    imageUrl: result.image ?? null,
  }));
};

export interface RecipeIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  imageUrl: string | null;
}

export interface RecipeDetail {
  id: number;
  title: string;
  imageUrl: string | null;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export const getRecipeDetail = async (id: number): Promise<RecipeDetail> => {
  const info = await getRecipeInformation(id);

  return {
    id: info.id,
    title: info.title,
    imageUrl: info.image ?? null,
    servings: info.servings,
    readyInMinutes: info.readyInMinutes,
    sourceUrl: info.sourceUrl ?? null,
    ingredients: (info.extendedIngredients ?? []).map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      imageUrl: toIngredientImageUrl(ingredient.image),
    })),
    // Flattened across instruction groups (a recipe with sub-recipes, e.g.
    // "sauce" + "assembly", gets more than one group) — the grouping
    // rarely matters for a simple step-by-step list.
    steps: (info.analyzedInstructions ?? []).flatMap((group) =>
      group.steps.map((step) => step.step),
    ),
  };
};

export interface RecipeIngredientPrice {
  name: string;
  priceUsd: number;
  amount: number;
  unit: string;
  imageUrl: string | null;
}

export interface RecipePriceBreakdown {
  ingredients: RecipeIngredientPrice[];
  totalCostUsd: number;
  totalCostPerServingUsd: number;
}

const centsToUsd = (cents: number): number => Math.round(cents) / 100;

export const getRecipePriceBreakdown = async (
  id: number,
): Promise<RecipePriceBreakdown> => {
  const breakdown = await spoonacularGetPriceBreakdown(id);

  return {
    ingredients: breakdown.ingredients.map((ingredient) => ({
      name: ingredient.name,
      priceUsd: centsToUsd(ingredient.price),
      amount: ingredient.amount.us.value,
      unit: ingredient.amount.us.unit,
      imageUrl: toIngredientImageUrl(ingredient.image),
    })),
    totalCostUsd: centsToUsd(breakdown.totalCost),
    totalCostPerServingUsd: centsToUsd(breakdown.totalCostPerServing),
  };
};
