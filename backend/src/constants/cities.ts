import usCities from "../data/us-cities.json";

// ~32k US places ("City, ST") derived from the Census Bureau's 2024
// Gazetteer place files (all 50 states + DC), stripped of their LSAD
// suffix ("city"/"town"/"village"/"CDP"/etc.) — see
// /Users/jordandeeds/Documents/coding/fitness/backend for the generation
// script if this ever needs regenerating from a newer Gazetteer release.
export const CITIES: readonly string[] = usCities;

const CITY_SET = new Set(CITIES);

export const isValidCity = (city: string): boolean => CITY_SET.has(city);

export const searchCities = (query: string, limit = 50): string[] => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return [];

  const results: string[] = [];
  for (const city of CITIES) {
    if (city.toLowerCase().startsWith(normalized)) {
      results.push(city);
      if (results.length >= limit) return results;
    }
  }

  // Fall back to a substring match (not just prefix) if the prefix search
  // came up short, so e.g. "york" still surfaces "New York, NY".
  if (results.length < limit) {
    for (const city of CITIES) {
      if (results.length >= limit) break;
      if (results.includes(city)) continue;
      if (city.toLowerCase().includes(normalized)) {
        results.push(city);
      }
    }
  }

  return results;
};
