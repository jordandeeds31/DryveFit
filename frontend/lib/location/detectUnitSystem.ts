import * as Location from "expo-location";
import { updateProfile } from "@/lib/api/users.api";
import { queryClient } from "@/lib/api/queryClient";

// ISO 3166-1 alpha-2 codes for the only countries that primarily use
// imperial units (lbs, miles, feet/inches) day-to-day — everywhere else
// defaults to metric.
const IMPERIAL_COUNTRY_CODES = new Set(["US", "LR", "MM"]);

// Fire-and-forget, called right after signup — never awaited by the
// caller, never surfaces an error. A denied permission, no GPS fix, or a
// reverse-geocode failure just leaves unitSystem unset, which the rest of
// the app already treats the same as imperial (today's hardcoded
// default), so there's nothing to recover from here. A manual override
// lives in Profile settings for anyone this gets wrong or who never
// grants the permission at all.
export const detectAndSaveUnitSystem = async (): Promise<void> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const position = await Location.getCurrentPositionAsync({
      // Country-level precision is all this needs — no reason to wait on
      // (or drain battery for) a high-accuracy GPS fix here.
      accuracy: Location.Accuracy.Low,
    });

    const [place] = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    const countryCode = place?.isoCountryCode;
    if (!countryCode) return;

    const unitSystem = IMPERIAL_COUNTRY_CODES.has(countryCode)
      ? "imperial"
      : "metric";

    await updateProfile({ unitSystem });
    // Called directly (not through useUpdateProfile), so nothing else
    // invalidates the cached currentUser query — without this, a
    // detection that finishes after the Home screen's already fetched
    // (the common case, since this races that fetch rather than blocking
    // it) would leave the stale unset value cached for up to the 5min
    // global staleTime.
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  } catch {
    // Best-effort — see comment above.
  }
};
