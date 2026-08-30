export interface RecipeSearchResult {
  id: number;
  title: string;
  imageUrl: string | null;
}

export interface RecipeSearchFilters {
  query?: string;
  cuisine?: string;
  diet?: string;
  mealType?: string;
  sort?: "popularity";
}

// Curated subsets of Spoonacular's full valid-value lists — chosen for
// what people actually filter by, not every value the API accepts.
export const RECIPE_CUISINES = [
  "Italian",
  "Mexican",
  "Chinese",
  "Indian",
  "American",
  "Mediterranean",
  "French",
  "Japanese",
  "Thai",
] as const;

export const RECIPE_DIETS = [
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Ketogenic",
  "Paleo",
] as const;

export const RECIPE_MEAL_TYPES = [
  "Breakfast",
  "Main Course",
  "Dessert",
  "Snack",
  "Appetizer",
  "Side Dish",
  "Soup",
  "Salad",
] as const;

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
