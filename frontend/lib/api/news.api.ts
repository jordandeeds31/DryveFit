import apiClient from "./client";
import { NewsArticle } from "@/types/news.types";

export const getNews = async (query?: string): Promise<NewsArticle[]> => {
  const { data } = await apiClient.get("/api/news", {
    params: query ? { q: query } : undefined,
  });
  return data.result.articles;
};
