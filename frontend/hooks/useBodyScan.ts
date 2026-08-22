import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { submitBodyScan, getBodyScanHistory } from "@/lib/api/bodyScan.api";

export const useBodyScanHistory = () => {
  return useQuery({
    queryKey: ["bodyScans"],
    queryFn: getBodyScanHistory,
  });
};

export const useSubmitBodyScan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitBodyScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bodyScans"] });
    },
  });
};
