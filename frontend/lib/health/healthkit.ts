import { Platform } from "react-native";
import AppleHealthKit from "react-native-health";
import type { HealthInputOptions, HealthKitPermissions, HealthValue } from "react-native-health";

// react-native-health's index.d.ts declares `HealthPermission`, `HealthUnit`,
// and `HealthStatusCode` as real enums, but the compiled index.js never
// exports them as runtime values (only a default AppleHealthKit object) —
// importing them as values crashes with "Cannot read property of undefined".
// Its own source (src/constants/Permissions.js, Units.js) confirms every
// member's string value is identical to its key, so plain string literals
// are used here instead, matching the type shapes without the broken import.
const permissions: HealthKitPermissions = {
  permissions: {
    read: ["HeartRate", "ActiveEnergyBurned", "Workout"] as HealthKitPermissions["permissions"]["read"],
    write: [],
  },
};

const SHARING_AUTHORIZED = 2;

// initHealthKit's completion only fires once the user responds to iOS's
// native permission sheet. If that sheet never appears or gets dismissed
// some other way (backgrounding the app, a Simulator rendering glitch),
// the callback never fires and the caller would hang forever with no way
// to recover — this guarantees the promise always settles.
const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
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

export const requestHealthKitAuthorization = (): Promise<boolean> => {
  if (Platform.OS !== "ios") return Promise.resolve(false);

  const request = new Promise<boolean>((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      resolve(!error);
    });
  });

  return withTimeout(request, 20_000, false);
};

export const isHealthKitAuthorized = (): Promise<boolean> => {
  if (Platform.OS !== "ios") return Promise.resolve(false);

  return new Promise((resolve) => {
    AppleHealthKit.getAuthStatus(permissions, (error, results) => {
      if (error) {
        resolve(false);
        return;
      }
      resolve(results.permissions.read[0] === SHARING_AUTHORIZED);
    });
  });
};

export interface RecentHealthMetrics {
  latestHeartRate: number | null;
  caloriesBurned: number;
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

  const [heartRateSamples, energySamples] = await Promise.all([
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
  ]);

  const latestHeartRate =
    heartRateSamples.length > 0 ? heartRateSamples[0].value : null;
  const caloriesBurned = energySamples.reduce(
    (sum, sample) => sum + sample.value,
    0,
  );

  return { latestHeartRate, caloriesBurned };
};
