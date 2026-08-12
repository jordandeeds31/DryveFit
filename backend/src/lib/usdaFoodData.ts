import { env } from "../config/env";

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

const isConfigured = (): boolean => !!env.USDA_API_KEY;

export interface UsdaSearchNutrient {
  nutrientId: number;
  nutrientNumber?: string;
  nutrientName: string;
  unitName: string;
  value: number;
}

export interface UsdaSearchHit {
  fdcId: number;
  description: string;
  // "Foundation" | "SR Legacy" | "Survey (FNDDS)" | "Branded" — only
  // "Branded" gets treated as a branded/packaged item; everything else is
  // a generic ingredient.
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaSearchNutrient[];
}

interface UsdaSearchResponse {
  foods: UsdaSearchHit[];
}

export const searchFoods = async (query: string): Promise<UsdaSearchHit[]> => {
  if (!isConfigured()) {
    throw new Error("Food search is not configured (USDA_API_KEY missing)");
  }

  const params = new URLSearchParams({
    query,
    api_key: env.USDA_API_KEY!,
    pageSize: "25",
  });

  const response = await fetch(`${BASE_URL}/foods/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`USDA search failed with status ${response.status}`);
  }

  const data: UsdaSearchResponse = await response.json();
  return data.foods ?? [];
};

export interface UsdaDetailNutrient {
  nutrient: { id: number; number: string; name: string; unitName: string };
  amount?: number;
}

export interface UsdaFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: UsdaDetailNutrient[];
}

export const getFoodDetail = async (fdcId: string): Promise<UsdaFoodDetail> => {
  if (!isConfigured()) {
    throw new Error("Food search is not configured (USDA_API_KEY missing)");
  }

  const params = new URLSearchParams({ api_key: env.USDA_API_KEY! });
  const response = await fetch(
    `${BASE_URL}/food/${encodeURIComponent(fdcId)}?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`USDA food detail failed with status ${response.status}`);
  }

  return response.json();
};
