import apiClient from "./client";
import { DailyAnalysis } from "@/types/dailyAnalysis.types";

export const runDailyAnalysis = async (date: string): Promise<DailyAnalysis> => {
  const { data } = await apiClient.post(
    "/api/daily-analysis/run",
    { date },
    // A deterministic calc plus an LLM call, same timeout reasoning as
    // the other AI-backed endpoints in this app.
    { timeout: 30000 },
  );
  return data.result.analysis;
};

export const getDailyAnalysis = async (date: string): Promise<DailyAnalysis | null> => {
  const { data } = await apiClient.get(`/api/daily-analysis/${date}`);
  return data.result.analysis;
};

export const markDailyAnalysisViewed = async (id: string): Promise<void> => {
  await apiClient.post(`/api/daily-analysis/${id}/viewed`);
};
