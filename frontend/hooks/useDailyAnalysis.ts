import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  runDailyAnalysis,
  getDailyAnalysis,
  markDailyAnalysisViewed,
} from "@/lib/api/dailyAnalysis.api";

export const useDailyAnalysis = (date: string | null) => {
  return useQuery({
    queryKey: ["dailyAnalysis", date],
    queryFn: () => getDailyAnalysis(date!),
    enabled: !!date,
  });
};

export const useRunDailyAnalysis = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runDailyAnalysis,
    onSuccess: (analysis) => {
      queryClient.setQueryData(["dailyAnalysis", analysis.date], analysis);
    },
  });
};

export const useMarkDailyAnalysisViewed = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markDailyAnalysisViewed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyAnalysis"] });
    },
  });
};
