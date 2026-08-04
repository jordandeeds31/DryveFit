import { useQuery } from "@tanstack/react-query";
import { searchCities } from "@/lib/api/cities.api";

export const useCitySearch = (query: string) => {
  return useQuery({
    queryKey: ["citySearch", query],
    queryFn: () => searchCities(query),
    enabled: query.trim().length >= 2,
  });
};
