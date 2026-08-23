import { useQuery } from "@tanstack/react-query";
import { getNews } from "@/lib/api/news.api";
import { NewsCategory } from "@/types/news.types";

export const useNews = (query?: string, categories?: NewsCategory[]) => {
  // Sorted/joined so selecting the same categories in a different order
  // (or a re-render with a new array identity) doesn't register as a
  // different query key and trigger a pointless refetch.
  const categoriesKey = (categories ?? []).slice().sort().join(",");

  return useQuery({
    queryKey: ["news", query ?? "", categoriesKey],
    queryFn: () => getNews(query, categories),
    // Matches the backend's own 15-min cache — no point refetching more
    // often than the server-side feed cache itself refreshes.
    staleTime: 15 * 60 * 1000,
  });
};
