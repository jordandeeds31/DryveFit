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

// usState (2-letter abbreviation) scopes the search to one US state —
// omit for non-US countries, which the app's city list only scopes to
// country anyway. Returns null if the list has no entry for that
// country at all (or, for the US, none in that state).
export const getNearestCity = async (
  lat: number,
  lng: number,
  countryCode: string,
  usState?: string,
): Promise<string | null> => {
  const { data } = await apiClient.get("/api/cities/nearest", {
    params: {
      lat,
      lng,
      country: countryCode,
      ...(usState ? { state: usState } : {}),
    },
  });
  return data.result.city;
};
