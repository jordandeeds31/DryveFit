import apiClient from "./client";

export const searchCities = async (query: string): Promise<string[]> => {
  const { data } = await apiClient.get(
    `/api/cities?q=${encodeURIComponent(query)}`,
  );
  return data.result.cities;
};
