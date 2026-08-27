import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMerchInterest,
  registerMerchInterest,
} from "@/lib/api/storefront.api";

export const useMerchInterest = (productKey: string) => {
  return useQuery({
    queryKey: ["merchInterest", productKey],
    queryFn: () => getMerchInterest(productKey),
  });
};

export const useRegisterMerchInterest = (productKey: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => registerMerchInterest(productKey),
    onSuccess: (summary) => {
      queryClient.setQueryData(["merchInterest", productKey], summary);
    },
  });
};
