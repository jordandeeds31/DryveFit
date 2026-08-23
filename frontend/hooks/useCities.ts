import { useQuery } from "@tanstack/react-query";
import { searchCities, getCountries } from "@/lib/api/cities.api";

// Static list (244 countries), so a long staleTime avoids refetching it
// every time CityPicker mounts.
export const useCountries = () => {
  return useQuery({
    queryKey: ["countries"],
    queryFn: getCountries,
    staleTime: Infinity,
  });
};

export const useCitySearch = (query: string, countryCode?: string) => {
  return useQuery({
    queryKey: ["citySearch", query, countryCode ?? ""],
    queryFn: () => searchCities(query, countryCode),
    enabled: query.trim().length >= 2 && !!countryCode,
  });
};
