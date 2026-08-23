import apiClient from "./client";

export interface Country {
  code: string;
  name: string;
}

export const getCountries = async (): Promise<Country[]> => {
  const { data } = await apiClient.get("/api/cities/countries");
  return data.result.countries;
};

export const searchCities = async (
  query: string,
  countryCode?: string,
): Promise<string[]> => {
  const { data } = await apiClient.get("/api/cities", {
    params: {
      q: query,
      ...(countryCode ? { country: countryCode } : {}),
    },
  });
  return data.result.cities;
};
