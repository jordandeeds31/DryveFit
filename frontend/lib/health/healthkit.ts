import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AppleHealthKit from "react-native-health";
import type {
  HealthInputOptions,
  HealthKitPermissions,
  HealthValue,
} from "react-native-health";

// react-native-health's index.d.ts declares `HealthPermission`, `HealthUnit`,
// and `HealthStatusCode` as real enums, but the compiled index.js never
// exports them as runtime values (only a default AppleHealthKit object) —
// importing them as values crashes with "Cannot read property of undefined".
// Its own source (src/constants/Permissions.js, Units.js) confirms every
// member's string value is identical to its key, so plain string literals
// are used here instead, matching the type shapes without the broken import.
// Broad on purpose — asking for only the 3-4 types this app actively
// queries today (see queryRecentHeartRateAndEnergy below) made iOS's
// connect sheet show just those few toggles, which read as "barely
// integrated" and left every other stat (distance, body measurements,
// sleep, nutrition) unavailable to any feature that might want it later
// without re-prompting for authorization all over again. Requesting the
// full set relevant to a fitness + nutrition app up front means the sheet
// shows everything Health tracks that this app could plausibly use.
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      // Activity
      "StepCount",
      "DistanceWalkingRunning",
      "DistanceCycling",
      "DistanceSwimming",
      "FlightsClimbed",
      "ActiveEnergyBurned",
      "BasalEnergyBurned",
      "AppleExerciseTime",
      "AppleStandTime",
      "Workout",
      // Heart & vitals
      "HeartRate",
      "RestingHeartRate",
      "HeartRateVariability",
      "WalkingHeartRateAverage",
      "Vo2Max",
      // Body measurements
      "BodyMass",
      "BodyFatPercentage",
      "LeanBodyMass",
      "Height",
      "BodyMassIndex",
      // Sleep
      "SleepAnalysis",
      // Nutrition
      "EnergyConsumed",
      "Protein",
      "Carbohydrates",
      "FatTotal",
      "Fiber",
      "Sugar",
      "Water",
    ] as HealthKitPermissions["permissions"]["read"],
    write: [],
  },
};

const HEALTHKIT_CONNECTED_KEY_PREFIX = "healthKitConnected";

// iOS's own permission grant is per-app, not per-account — it stays
// authorized underneath us no matter which Dryve account is signed in on
// this device. Our own "connected" flag has to be scoped per-user (keyed by
// id), not global, or a second account signing in on the same phone would
// silently inherit the first account's connected state instead of being
// asked to opt in for itself.
// expo-secure-store keys may only contain alphanumerics, ".", "-", and "_"
// — no ":" — so the separator here has to be one of those, not a colon.
const connectedKeyFor = (userId: string) =>
  `${HEALTHKIT_CONNECTED_KEY_PREFIX}_${userId}`;

// HealthKit deliberately never reveals true read-authorization status to
// apps (getAuthStatus is only meaningful for write/share types, and even
// that is flaky) — re-deriving "connected" from a live query on every app
// open/focus is exactly why the UI kept asking users to reconnect even
// after they'd already granted access. Instead, "connected" is tracked as
// "the user completed the connect flow at least once," a fact the app
// actually controls, and persisted locally so it survives app restarts and
// re-logins.
export const hasCompletedHealthKitConnect = async (
  userId: string,
): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(connectedKeyFor(userId));
  return value === "true";
};

const markHealthKitConnected = async (userId: string): Promise<void> => {
  await SecureStore.setItemAsync(connectedKeyFor(userId), "true");
};

// iOS gives apps no API to revoke their own HealthKit authorization — only
// the user can do that, from the Health app or Settings. This only flips
// the local "connected" flag every read call in the app gates on
// (queryRecentHeartRateAndEnergy's callers, Cardio's connect prompt, etc.),
// so toggling off here stops Dryve from querying Health data even though
// the underlying OS-level grant is still technically in place. Toggling
// back on later re-runs requestHealthKitAuthorization, which resolves
// immediately with no new prompt since iOS already has the grant on file.
export const disconnectHealthKit = async (userId: string): Promise<void> => {
  await SecureStore.deleteItemAsync(connectedKeyFor(userId));
};

const DEVICE_PROMPT_DISMISSED_KEY_PREFIX = "deviceSetupPromptDismissed";

const devicePromptDismissedKeyFor = (userId: string) =>
  `${DEVICE_PROMPT_DISMISSED_KEY_PREFIX}_${userId}`;

// Scoped per-user for the same reason as connectedKeyFor above — a second
// account signing in on this device shouldn't inherit the first account's
// "already dismissed this" choice.
export const hasDismissedDeviceSetupPrompt = async (
  userId: string,
): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(
    devicePromptDismissedKeyFor(userId),
  );
  return value === "true";
};

export const dismissDeviceSetupPrompt = async (
  userId: string,
): Promise<void> => {
  await SecureStore.setItemAsync(devicePromptDismissedKeyFor(userId), "true");
};

// initHealthKit's completion only fires once the user responds to iOS's
// native permission sheet. If that sheet never appears or gets dismissed
// some other way (backgrounding the app, a Simulator rendering glitch),
// the callback never fires and the caller would hang forever with no way
// to recover — this guarantees the promise always settles.
const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export const isHealthKitAvailable = (): Promise<boolean> => {
  if (Platform.OS !== "ios") return Promise.resolve(false);

  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((error, results) => {
      resolve(!error && results);
    });
  });
};

export const requestHealthKitAuthorization = (
  userId: string,
): Promise<boolean> => {
  if (Platform.OS !== "ios") return Promise.resolve(false);

  const request = new Promise<boolean>((resolve) => {
    AppleHealthKit.initHealthKit(permissions, async (error) => {
      const success = !error;
      if (success) await markHealthKitConnected(userId);
      resolve(success);
    });
  });

  return withTimeout(request, 20_000, false);
};

export interface RecentHealthMetrics {
  latestHeartRate: number | null;
  caloriesBurned: number;
  stepCount: number;
}

export const queryRecentHeartRateAndEnergy = async (
  sinceDate: Date,
): Promise<RecentHealthMetrics> => {
  const heartRateOptions: HealthInputOptions = {
    startDate: sinceDate.toISOString(),
    ascending: false,
    limit: 1,
    unit: "bpm" as HealthInputOptions["unit"],
  };
  const energyOptions: HealthInputOptions = {
    startDate: sinceDate.toISOString(),
    unit: "kilocalorie" as HealthInputOptions["unit"],
  };
  // getStepCount only ever sums a whole calendar day, so it can't be scoped
  // to "since the session started" — getDailyStepCountSamples takes an
  // explicit startDate/endDate range instead, bucketed by `period` minutes,
  // which is summed below into a single session total.
  const stepOptions: HealthInputOptions = {
    startDate: sinceDate.toISOString(),
    endDate: new Date().toISOString(),
  };

  const [heartRateSamples, energySamples, stepSamples] = await Promise.all([
    new Promise<HealthValue[]>((resolve) => {
      AppleHealthKit.getHeartRateSamples(heartRateOptions, (error, results) => {
        resolve(error ? [] : results);
      });
    }),
    new Promise<HealthValue[]>((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(energyOptions, (error, results) => {
        resolve(error ? [] : results);
      });
    }),
    new Promise<HealthValue[]>((resolve) => {
      AppleHealthKit.getDailyStepCountSamples(stepOptions, (error, results) => {
        resolve(error ? [] : results);
      });
    }),
  ]);

  const latestHeartRate =
    heartRateSamples.length > 0 ? heartRateSamples[0].value : null;
  const caloriesBurned = energySamples.reduce(
    (sum, sample) => sum + sample.value,
    0,
  );
  const stepCount = Math.round(
    stepSamples.reduce((sum, sample) => sum + sample.value, 0),
  );

  return { latestHeartRate, caloriesBurned, stepCount };
};
