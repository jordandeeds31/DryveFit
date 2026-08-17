import { UnitSystem } from "@/types/user.types";

const LBS_PER_KG = 2.20462262185;
const CM_PER_INCH = 2.54;
const METERS_PER_MILE = 1609.344;
const METERS_PER_KM = 1000;

// Every stored value (ExerciseSet.weight, User.weightLbs/heightInches,
// CardioSession.distanceMeters) stays in its existing unit regardless of
// unitSystem — lbs/inches/meters, unchanged from before this preference
// existed. unitSystem only affects the boundary: what a metric user types
// gets converted to the stored unit before it's sent to the API, and
// what's read back gets converted to metric before it's displayed. This
// means no data migration, and imperial users see byte-for-byte the same
// behavior as before.

export const lbsToKg = (lbs: number): number => lbs / LBS_PER_KG;
export const kgToLbs = (kg: number): number => kg * LBS_PER_KG;

export const inchesToCm = (inches: number): number => inches * CM_PER_INCH;
export const cmToInches = (cm: number): number => cm / CM_PER_INCH;

export const metersToMiles = (meters: number): number => meters / METERS_PER_MILE;
export const metersToKm = (meters: number): number => meters / METERS_PER_KM;
export const milesToMeters = (miles: number): number => miles * METERS_PER_MILE;

export const weightUnitLabel = (unitSystem: UnitSystem): string =>
  unitSystem === "metric" ? "kg" : "lbs";

export const distanceUnitLabel = (unitSystem: UnitSystem): string =>
  unitSystem === "metric" ? "km" : "mi";

// Rounds to 1 decimal — plenty of precision for a displayed weight
// without showing the long float tail a raw lbs<->kg conversion produces.
const round1 = (value: number): number => Math.round(value * 10) / 10;

// Converts a stored lbs value to the display value for this unit system.
// Returns the raw number (not a string) so callers can still do their own
// formatting (e.g. `${displayWeight(...)} lbs`) — see formatWeight below
// for the common "value + unit" case.
export const displayWeight = (
  storedLbs: number,
  unitSystem: UnitSystem,
): number => (unitSystem === "metric" ? round1(lbsToKg(storedLbs)) : storedLbs);

export const formatWeight = (
  storedLbs: number | null | undefined,
  unitSystem: UnitSystem,
): string =>
  storedLbs == null
    ? "-"
    : `${displayWeight(storedLbs, unitSystem)} ${weightUnitLabel(unitSystem)}`;

// Converts a value the user typed/selected in their own unit system back
// to lbs for storage — the inverse of displayWeight.
export const toStoredLbs = (
  displayValue: number,
  unitSystem: UnitSystem,
): number => (unitSystem === "metric" ? kgToLbs(displayValue) : displayValue);

export const displayDistance = (
  storedMeters: number,
  unitSystem: UnitSystem,
): number =>
  Math.round(
    (unitSystem === "metric"
      ? metersToKm(storedMeters)
      : metersToMiles(storedMeters)) * 100,
  ) / 100;

export const formatDistance = (
  storedMeters: number,
  unitSystem: UnitSystem,
): string =>
  `${displayDistance(storedMeters, unitSystem)} ${distanceUnitLabel(unitSystem)}`;

// Below this, a pace figure is noise rather than signal (a few steps
// register as a wildly fast/slow rate) — checked in meters so the
// threshold doesn't shift between unit systems, unlike the ~0.05mi guard
// this replaced.
const MIN_METERS_FOR_PACE = 80.5;

// "M:SS per mile/km" — the unit matches whatever displayDistance would
// use, so a pace and the distance it's derived from are always shown in
// the same system together.
export const formatPace = (
  storedMeters: number,
  durationSecs: number,
  unitSystem: UnitSystem,
): string => {
  if (storedMeters < MIN_METERS_FOR_PACE || durationSecs < 10) return "--:--";

  const distance =
    unitSystem === "metric"
      ? metersToKm(storedMeters)
      : metersToMiles(storedMeters);
  const paceSecondsPerUnit = durationSecs / distance;
  const minutes = Math.floor(paceSecondsPerUnit / 60);
  const seconds = Math.round(paceSecondsPerUnit % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
