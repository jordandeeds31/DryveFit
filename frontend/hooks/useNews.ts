import { useQuery } from "@tanstack/react-query";
import { getNews } from "@/lib/api/news.api";

export const useNews = (query?: string) => {
  return useQuery({
    queryKey: ["news", query ?? ""],
    queryFn: () => getNews(query),
    // Matches the backend's own 15-min cache — no point refetching more
    // often than the server-side feed cache itself refreshes.
    staleTime: 15 * 60 * 1000,
  });
};
