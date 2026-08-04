import { useQuery } from "@tanstack/react-query";
import { getWorkingOutCount } from "@/lib/api/activity.api";

export const useWorkingOutCount = () => {
  return useQuery({
    queryKey: ["workingOutCount"],
    queryFn: getWorkingOutCount,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
};
