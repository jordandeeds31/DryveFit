import worldCities from "../data/world-cities.json";
import worldCountries from "../data/countries.json";

// ~33k worldwide cities/towns (population 15,000+, GeoNames' cities15000
// export) — US entries keep the "City, ST" format the app already used
// (GeoNames' own admin1 code for US rows IS the 2-letter state
// abbreviation), everywhere else is "City, Country". See
// /Users/jordandeeds/Documents/coding/fitness/backend for the generation
// script if this ever needs regenerating from a newer GeoNames release.
interface CityEntry {
  label: string;
  countryCode: string;
}

export const CITIES: readonly CityEntry[] = worldCities;

export interface Country {
  code: string;
  name: string;
}

// Only the 244 countries actually represented in CITIES above (not the
// full ISO 3166 list) — every entry here is guaranteed to have at least
// one selectable city.
export const COUNTRIES: readonly Country[] = worldCountries;

const CITY_LABEL_SET = new Set(CITIES.map((c) => c.label));

export const isValidCity = (city: string): boolean => CITY_LABEL_SET.has(city);

// countryCode narrows the search to one country (the picker's own flow —
// pick a country first, then search within it) — omitted, it searches
// worldwide, e.g. for validating/matching an already-known label.
//
// An empty query only returns results when countryCode is given — that's
// "show me this country's dropdown before I've typed anything" (the
// picker's own down-arrow), not "list something for a worldwide empty
// search", which would be both meaningless and enormous.
export const searchCities = (
  query: string,
  countryCode?: string,
  limit = 50,
): string[] => {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    if (!countryCode) return [];
    return CITIES.filter((c) => c.countryCode === countryCode)
      .slice(0, limit)
      .map((c) => c.label);
  }

  const pool = countryCode
    ? CITIES.filter((c) => c.countryCode === countryCode)
    : CITIES;

  const results: string[] = [];
  for (const city of pool) {
    if (city.label.toLowerCase().startsWith(normalized)) {
      results.push(city.label);
      if (results.length >= limit) return results;
    }
  }

  // Fall back to a substring match (not just prefix) if the prefix search
  // came up short, so e.g. "york" still surfaces "New York, NY".
  if (results.length < limit) {
    for (const city of pool) {
      if (results.length >= limit) break;
      if (results.includes(city.label)) continue;
      if (city.label.toLowerCase().includes(normalized)) {
        results.push(city.label);
      }
    }
  }

  return results;
};
