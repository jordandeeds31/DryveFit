import * as Location from "expo-location";
import { searchCities } from "@/lib/api/cities.api";
import { updateProfile } from "@/lib/api/users.api";
import { queryClient } from "@/lib/api/queryClient";

// reverseGeocodeAsync returns the full state/province name (e.g.
// "Illinois"), but the app's own city list — and CityPicker's search —
// only recognizes the Census Gazetteer's "City, ST" format (2-letter USPS
// abbreviation). This is what bridges the two; only the 50 states + DC
// matter here since the underlying city list is US-only.
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
// set yet" — the viewer can always search and pick one manually there.
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
    const stateAbbr = place?.region ? STATE_NAME_TO_ABBR[place.region] : null;
    if (!cityName || !stateAbbr) return;

    const candidate = `${cityName}, ${stateAbbr}`;

    // Confirms this is a real entry in the app's own city list (not just
    // a plausible-looking string) — reuses the same search the manual
    // CityPicker calls, rather than trusting the device's geocoder output
    // to already match the Census Gazetteer's exact naming/formatting.
    const matches = await searchCities(candidate);
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
