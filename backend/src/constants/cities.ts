import worldCities from "../data/world-cities.json";
import worldCountries from "../data/countries.json";

// ~33k worldwide cities/towns (population 15,000+, GeoNames' cities15000
// export) — US entries keep the "City, ST" format the app already used
// (GeoNames' own admin1 code for US rows IS the 2-letter state
// abbreviation), everywhere else is "City, Country". lat/lng were joined
// in afterward from the same cities15000 export (matched on country +
// name, and admin1 too for US rows) — every one of the existing 33,463
// entries matched with none dropped or added, so this is the exact same
// city list as before, just with coordinates attached for
// findNearestCity below.
interface CityEntry {
  label: string;
  countryCode: string;
  lat: number;
  lng: number;
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

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const haversineDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

// For auto-detecting a signup's city from GPS: nearest entry in the same
// list searchCities already draws from (still just the most-populous
// cities per state/country — this never adds smaller towns to the list,
// it just finds which listed city a coordinate is actually closest to,
// instead of requiring the device's reverse-geocoded city name to be an
// exact — and often absent — entry in that list).
//
// usState scopes US lookups to one state (matching the label's ", ST"
// suffix) so a coordinate just across a state line never returns a city
// in the wrong state; non-US callers are already scoped to one country
// via countryCode alone, since the list doesn't carry a finer admin
// division for them.
export const findNearestCity = (
  lat: number,
  lng: number,
  countryCode: string,
  usState?: string,
): string | null => {
  let nearestLabel: string | null = null;
  let nearestDistanceKm = Infinity;

  for (const city of CITIES) {
    if (city.countryCode !== countryCode) continue;
    if (usState && !city.label.endsWith(`, ${usState}`)) continue;

    const distanceKm = haversineDistanceKm(lat, lng, city.lat, city.lng);
    if (distanceKm < nearestDistanceKm) {
      nearestDistanceKm = distanceKm;
      nearestLabel = city.label;
    }
  }

  return nearestLabel;
};
