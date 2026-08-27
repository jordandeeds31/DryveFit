import apiClient from "./client";

export interface MerchInterestSummary {
  count: number;
  hasInterest: boolean;
}

export const getMerchInterest = async (
  productKey: string,
): Promise<MerchInterestSummary> => {
  const { data } = await apiClient.get("/api/storefront/interest", {
    params: { productKey },
  });
  return data.result;
};

export const registerMerchInterest = async (
  productKey: string,
): Promise<MerchInterestSummary> => {
  const { data } = await apiClient.post("/api/storefront/interest", {
    productKey,
  });
  return data.result;
};
