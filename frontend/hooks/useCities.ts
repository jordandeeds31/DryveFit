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
  const trimmedLength = query.trim().length;
  return useQuery({
    queryKey: ["citySearch", query, countryCode ?? ""],
    queryFn: () => searchCities(query, countryCode),
    // Empty query still runs (once a country's picked) — that's the
    // dropdown arrow's own "browse this country's cities" list, not a
    // real search. A single character stays disabled, same as before,
    // since one letter worldwide-within-a-country is still too broad to
    // be a useful filter.
    enabled: !!countryCode && (trimmedLength === 0 || trimmedLength >= 2),
  });
};
