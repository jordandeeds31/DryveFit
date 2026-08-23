import apiClient from "./client";
import { NewsArticle, NewsCategory } from "@/types/news.types";

export const getNews = async (
  query?: string,
  categories?: NewsCategory[],
): Promise<NewsArticle[]> => {
  const { data } = await apiClient.get("/api/news", {
    params: {
      ...(query ? { q: query } : {}),
      ...(categories && categories.length > 0
        ? { categories: categories.join(",") }
        : {}),
    },
  });
  return data.result.articles;
};
