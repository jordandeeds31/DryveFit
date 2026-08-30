import { env } from "../config/env";

const BASE_URL = "https://api.spoonacular.com";

const isConfigured = (): boolean => !!env.SPOONACULAR_API_KEY;

export interface SpoonacularSearchHit {
  id: number;
  title: string;
  image?: string;
}

interface SpoonacularSearchResponse {
  results: SpoonacularSearchHit[];
}

export interface RecipeSearchFilters {
  query?: string;
  // Real Spoonacular filter params (cuisine/diet/type), not folded into
  // the free-text query — "italian" as a keyword matches titles/
  // descriptions loosely and pulls in whatever mentions the word, while
  // cuisine=Italian only returns recipes Spoonacular has actually tagged
  // that way.
  cuisine?: string;
  diet?: string;
  mealType?: string;
  sort?: "popularity";
}

export const searchRecipes = async (
  filters: RecipeSearchFilters,
): Promise<SpoonacularSearchHit[]> => {
  if (!isConfigured()) {
    throw new Error("Recipe search is not configured (SPOONACULAR_API_KEY missing)");
  }

  const params = new URLSearchParams({
    apiKey: env.SPOONACULAR_API_KEY!,
    number: "20",
  });
  if (filters.query) params.set("query", filters.query);
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.diet) params.set("diet", filters.diet);
  if (filters.mealType) params.set("type", filters.mealType);
  if (filters.sort) params.set("sort", filters.sort);

  const response = await fetch(
    `${BASE_URL}/recipes/complexSearch?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Spoonacular search failed with status ${response.status}`);
  }

  const data: SpoonacularSearchResponse = await response.json();
  return data.results ?? [];
};

export interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  image?: string;
}

export interface SpoonacularInstructionStep {
  number: number;
  step: string;
}

export interface SpoonacularAnalyzedInstruction {
  name: string;
  steps: SpoonacularInstructionStep[];
}

export interface SpoonacularRecipeInformation {
  id: number;
  title: string;
  image?: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl?: string;
  extendedIngredients: SpoonacularIngredient[];
  analyzedInstructions: SpoonacularAnalyzedInstruction[];
}

export const getRecipeInformation = async (
  id: number,
): Promise<SpoonacularRecipeInformation> => {
  if (!isConfigured()) {
    throw new Error("Recipe search is not configured (SPOONACULAR_API_KEY missing)");
  }

  const params = new URLSearchParams({
    apiKey: env.SPOONACULAR_API_KEY!,
    includeNutrition: "false",
  });
  const response = await fetch(
    `${BASE_URL}/recipes/${id}/information?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Spoonacular recipe detail failed with status ${response.status}`);
  }

  return response.json();
};

// Prices come back as US cents (e.g. 174.43 for a bag of blueberries) —
// left as-is here, converted to dollars in recipes.service.ts alongside
// everything else that shapes the raw API response for the frontend.
export interface SpoonacularPriceBreakdownIngredient {
  name: string;
  price: number;
  amount: {
    us: { unit: string; value: number };
  };
  image?: string;
}

export interface SpoonacularPriceBreakdown {
  ingredients: SpoonacularPriceBreakdownIngredient[];
  totalCost: number;
  totalCostPerServing: number;
}

export const getRecipePriceBreakdown = async (
  id: number,
): Promise<SpoonacularPriceBreakdown> => {
  if (!isConfigured()) {
    throw new Error("Recipe search is not configured (SPOONACULAR_API_KEY missing)");
  }

  const params = new URLSearchParams({ apiKey: env.SPOONACULAR_API_KEY! });
  const response = await fetch(
    `${BASE_URL}/recipes/${id}/priceBreakdownWidget.json?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Spoonacular price breakdown failed with status ${response.status}`);
  }

  return response.json();
};
