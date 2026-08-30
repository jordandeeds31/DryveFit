import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSavedRecipes, importRecipeFromLink } from "@/lib/api/savedRecipes.api";

export const useSavedRecipes = () => {
  return useQuery({
    queryKey: ["savedRecipes"],
    queryFn: getSavedRecipes,
  });
};

export const useImportRecipeFromLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importRecipeFromLink,
    onSuccess: (outcome) => {
      if (outcome.status === "saved") {
        queryClient.invalidateQueries({ queryKey: ["savedRecipes"] });
      }
    },
  });
};
