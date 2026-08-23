import * as Location from "expo-location";
import { searchCities, getCountries } from "@/lib/api/cities.api";
import { updateProfile } from "@/lib/api/users.api";
import { queryClient } from "@/lib/api/queryClient";

// reverseGeocodeAsync returns the full state/province name (e.g.
// "Illinois"), but the app's city list keeps the Census Gazetteer's
// "City, ST" format (2-letter USPS abbreviation) for the US specifically
// — see backend/src/constants/cities.ts. This bridges the two; only the
// 50 states + DC matter here, everywhere else uses the country name
// instead (fetched from the same /api/cities/countries CityPicker uses).
const STATE_NAME_TO_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR",
  California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  "District of Columbia": "DC", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME",
  Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE",
  Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
  "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
  Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT",
  Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};

// Fire-and-forget, called right after signup (mirrors the old
// detectAndSaveUnitSystem, which did the same for unitSystem before that
// became an unconditional default) — never awaited by the caller, never
// surfaces an error. A denied permission, no GPS fix, a reverse-geocode
// miss, or a city that doesn't match the app's own list just leaves city
// unset, which CityPicker (in EditProfileModal) already handles as "not
// set yet" — the viewer can always search (country first, then city) and
// pick one manually there.
export const detectAndSaveCity = async (): Promise<void> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const position = await Location.getCurrentPositionAsync({
      // City-level precision is all this needs.
      accuracy: Location.Accuracy.Low,
    });

    const [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const cityName = place?.city;
    const isoCountryCode = place?.isoCountryCode;
    if (!cityName || !isoCountryCode) return;

    let candidate: string;
    if (isoCountryCode === "US") {
      const stateAbbr = place?.region ? STATE_NAME_TO_ABBR[place.region] : null;
      if (!stateAbbr) return;
      candidate = `${cityName}, ${stateAbbr}`;
    } else {
      const countries = await getCountries();
      const country = countries.find((c) => c.code === isoCountryCode);
      if (!country) return;
      candidate = `${cityName}, ${country.name}`;
    }

    // Confirms this is a real entry in the app's own city list (not just
    // a plausible-looking string) — reuses the same search CityPicker
    // itself calls once a country is chosen, rather than trusting the
    // device geocoder's naming to already match exactly.
    const matches = await searchCities(candidate, isoCountryCode);
    if (!matches.includes(candidate)) return;

    await updateProfile({ city: candidate });
    // Called directly (not through useUpdateProfile), so nothing else
    // invalidates the cached currentUser query — without this, a
    // detection that finishes after the profile screen's already
    // fetched (the common case, since this races that fetch rather than
    // blocking it) would leave the stale unset value cached.
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
  } catch {
    // Best-effort — see comment above.
  }
};
