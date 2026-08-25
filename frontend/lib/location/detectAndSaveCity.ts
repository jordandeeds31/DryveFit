import * as Location from "expo-location";
import { getNearestCity } from "@/lib/api/cities.api";
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
// surfaces an error. A denied permission or no GPS fix just leaves city
// unset, which CityPicker (in EditProfileModal) already handles as "not
// set yet" — the viewer can always search (country first, then city) and
// pick one manually there.
//
// Deliberately does NOT require the device's reverse-geocoded city name
// to exactly match an entry in the app's list (that was the original
// approach, and silently failed for most non-major-metro users — the
// list only carries population 15,000+ cities, so anyone in a suburb or
// small town got a city name that simply wasn't in the list under any
// spelling). Instead it sends the raw GPS fix to the backend, which finds
// the *nearest* listed city by distance — findNearestCity in
// backend/src/constants/cities.ts. The list itself is unchanged (still
// only the most-populous city per area); this only changes how a
// coordinate gets matched to it.
export const detectAndSaveCity = async (): Promise<void> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      if (__DEV__) console.log("[detectAndSaveCity] bailed: permission", status);
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      // City-level precision is all this needs.
      accuracy: Location.Accuracy.Low,
    });

    const [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    // Reverse geocoding is only used for isoCountryCode/region now (to
    // scope the nearest-city search to the right state/country) — the
    // city NAME it returns is no longer used at all, since that's exactly
    // the field that used to cause silent failures.
    const isoCountryCode = place?.isoCountryCode;
    if (!isoCountryCode) {
      if (__DEV__) console.log("[detectAndSaveCity] bailed: no country from reverse geocode", place);
      return;
    }

    const usState =
      isoCountryCode === "US" && place?.region
        ? STATE_NAME_TO_ABBR[place.region]
        : undefined;

    const candidate = await getNearestCity(
      position.coords.latitude,
      position.coords.longitude,
      isoCountryCode,
      usState,
    );
    if (!candidate) {
      if (__DEV__) console.log("[detectAndSaveCity] bailed: no listed city near", { isoCountryCode, usState });
      return;
    }

    await updateProfile({ city: candidate });
    if (__DEV__) console.log("[detectAndSaveCity] saved city:", candidate);
    // Called directly (not through useUpdateProfile), so nothing else
    // invalidates the cached currentUser query — without this, a
    // detection that finishes after the profile screen's already
    // fetched (the common case, since this races that fetch rather than
    // blocking it) would leave the stale unset value cached.
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
  } catch (error) {
    // Best-effort — see comment above.
    if (__DEV__) console.log("[detectAndSaveCity] threw", error);
  }
};
