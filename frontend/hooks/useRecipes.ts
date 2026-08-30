import { useQuery } from "@tanstack/react-query";
import {
  searchRecipes,
  getRecipeDetail,
  getRecipePriceBreakdown,
} from "@/lib/api/recipes.api";
import { RecipeSearchFilters } from "@/types/recipes.types";

export const useRecipeSearch = (rawQuery: string, filters: RecipeSearchFilters) => {
  const query = rawQuery.trim();
  const isSearching = query.length > 1;
  // Popularity sort applies either way — for a real search it surfaces the
  // well-known/vetted recipes first instead of an arbitrary keyword-match
  // order; for the empty-query "browse" case it's the whole list.
  const appliedFilters: RecipeSearchFilters = {
    ...filters,
    query: isSearching ? query : undefined,
    sort: "popularity",
  };

  return useQuery({
    queryKey: ["recipeSearch", appliedFilters],
    queryFn: () => searchRecipes(appliedFilters),
    staleTime: isSearching ? 0 : 5 * 60 * 1000,
  });
};

export const useRecipeDetail = (id: number | null) => {
  return useQuery({
    queryKey: ["recipeDetail", id],
    queryFn: () => getRecipeDetail(id!),
    enabled: id != null,
  });
};

export const useRecipePriceBreakdown = (id: number | null) => {
  return useQuery({
    queryKey: ["recipePriceBreakdown", id],
    queryFn: () => getRecipePriceBreakdown(id!),
    enabled: id != null,
  });
};
