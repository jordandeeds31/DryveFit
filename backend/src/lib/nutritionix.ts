import { env } from "../config/env";

const BASE_URL = "https://trackapi.nutritionix.com/v2";

const isConfigured = (): boolean =>
  !!env.NUTRITIONIX_APP_ID && !!env.NUTRITIONIX_APP_KEY;

const headers = () => ({
  "Content-Type": "application/json",
  "x-app-id": env.NUTRITIONIX_APP_ID!,
  "x-app-key": env.NUTRITIONIX_APP_KEY!,
});

export interface NutritionixPhoto {
  thumb: string | null;
}

export interface NutritionixCommonHit {
  food_name: string;
  serving_unit: string;
  serving_qty: number;
  tag_id: string;
  photo: NutritionixPhoto;
}

export interface NutritionixBrandedHit {
  food_name: string;
  brand_name: string;
  serving_unit: string;
  serving_qty: number;
  nf_calories: number;
  nix_item_id: string;
  photo: NutritionixPhoto;
}

export interface NutritionixInstantResponse {
  common: NutritionixCommonHit[];
  branded: NutritionixBrandedHit[];
}

export interface NutritionixFoodDetail {
  food_name: string;
  brand_name: string | null;
  serving_qty: number;
  serving_unit: string;
  nf_calories: number;
  nf_protein: number;
  nf_total_carbohydrate: number;
  nf_total_fat: number;
}

// Free-text/typeahead search — no request body needed, matches what a
// search box would show as the user types.
export const searchInstant = async (
  query: string,
): Promise<NutritionixInstantResponse> => {
  if (!isConfigured()) {
    throw new Error(
      "Food search is not configured (NUTRITIONIX_APP_ID/NUTRITIONIX_APP_KEY missing)",
    );
  }

  const response = await fetch(
    `${BASE_URL}/search/instant?query=${encodeURIComponent(query)}`,
    { headers: headers() },
  );

  if (!response.ok) {
    throw new Error(`Nutritionix search failed with status ${response.status}`);
  }

  return response.json();
};

// A "common" (generic, unbranded) food's full nutrition — Nutritionix
// parses the free-text query itself, so passing back the exact food_name
// from the instant-search hit is enough to get one base serving's values.
export const getCommonFoodNutrients = async (
  foodName: string,
): Promise<NutritionixFoodDetail | null> => {
  if (!isConfigured()) {
    throw new Error(
      "Food search is not configured (NUTRITIONIX_APP_ID/NUTRITIONIX_APP_KEY missing)",
    );
  }

  const response = await fetch(`${BASE_URL}/natural/nutrients`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query: foodName }),
  });

  if (!response.ok) {
    throw new Error(`Nutritionix nutrients lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.foods?.[0] ?? null;
};

// A specific branded/packaged item's full nutrition, by the nix_item_id
// an instant-search branded hit returns.
export const getBrandedFoodNutrients = async (
  nixItemId: string,
): Promise<NutritionixFoodDetail | null> => {
  if (!isConfigured()) {
    throw new Error(
      "Food search is not configured (NUTRITIONIX_APP_ID/NUTRITIONIX_APP_KEY missing)",
    );
  }

  const response = await fetch(
    `${BASE_URL}/search/item?nix_item_id=${encodeURIComponent(nixItemId)}`,
    { headers: headers() },
  );

  if (!response.ok) {
    throw new Error(`Nutritionix item lookup failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.foods?.[0] ?? null;
};
