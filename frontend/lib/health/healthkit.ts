import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AppleHealthKit from "react-native-health";
import type {
  HealthInputOptions,
  HealthKitPermissions,
  HealthUnitOptions,
  HealthValue,
  HealthValueOptions,
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
    // Only types Dryve actually generates data for — a workout (strength
    // logs + cardio sessions), the nutrients captured by food logging, and
    // the weight/height collected in the nutrition setup form. Everything
    // else above is read-only because Dryve has no source of truth for it
    // (steps, heart rate, sleep, etc. come from the Watch/phone sensors or
    // other apps) — requesting write access nobody ever calls just bloats
    // the permission sheet and reads oddly in App Review.
    write: [
      "Workout",
      "EnergyConsumed",
      "Protein",
      "Carbohydrates",
      "FatTotal",
      "BodyMass",
      "Height",
    ] as HealthKitPermissions["permissions"]["write"],
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

const HEALTHKIT_ATTEMPTED_KEY_PREFIX = "healthKitAttemptedConnect";

const attemptedKeyFor = (userId: string) =>
  `${HEALTHKIT_ATTEMPTED_KEY_PREFIX}_${userId}`;

// Tracks whether this user has ever gone through the connect flow before,
// regardless of outcome — used to tell "first attempt failed" from "a
// later attempt failed again" in requestHealthKitAuthorization below. That
// distinction matters because of a real, confirmed HealthKit asymmetry:
// once the user answers the permission sheet for the READ types this app
// requests, iOS locks that answer in forever and will never show the sheet
// again for those exact types no matter how many more times the app calls
// initHealthKit — only the user manually re-enabling them in Settings >
// Health > Data Access & Devices can undo a decline. WRITE types don't
// have this restriction (iOS is willing to re-prompt those), which is why
// a user who declined everything once can still see a real permission
// sheet again on a second attempt and tap Allow — but that second sheet
// can only be re-granting the write types; the reads are already
// permanently stuck denied from the first decline, so probeHealthKitReadAccess
// below will keep failing forever regardless of how many more times the
// user retries from inside the app.
const hasAttemptedHealthKitConnectBefore = async (
  userId: string,
): Promise<boolean> => {
  const value = await SecureStore.getItemAsync(attemptedKeyFor(userId));
  return value === "true";
};

const markHealthKitAttempted = async (userId: string): Promise<void> => {
  await SecureStore.setItemAsync(attemptedKeyFor(userId), "true");
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

// initHealthKit's completion reports success as soon as the user responds
// to the native prompt, whether they granted or declined every read type —
// iOS deliberately never exposes true read-authorization status (see the
// comment on hasCompletedHealthKitConnect above). To tell "declined" from
// "granted" at connect time, this probes for real data across a handful of
// metrics iOS itself writes continuously in the background (basal/active
// energy in particular are estimated by the OS around the clock regardless
// of whether the user owns a Watch or has ever opened Health), so an empty
// result is a reliable signal the read grant was actually refused rather
// than "this user just doesn't have data yet." A week-wide window keeps
// this from false-negative-ing on a phone that was off/unused briefly.
const probeHealthKitReadAccess = async (): Promise<boolean> => {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 7);
  const rangeOptions: HealthInputOptions = {
    startDate: sinceDate.toISOString(),
    endDate: new Date().toISOString(),
  };

  const [stepSamples, basalEnergySamples, activeEnergySamples] =
    await Promise.all([
      new Promise<HealthValue[]>((resolve) => {
        AppleHealthKit.getDailyStepCountSamples(rangeOptions, (error, results) => {
          resolve(error ? [] : results);
        });
      }),
      new Promise<HealthValue[]>((resolve) => {
        AppleHealthKit.getBasalEnergyBurned(rangeOptions, (error, results) => {
          resolve(error ? [] : results);
        });
      }),
      new Promise<HealthValue[]>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(rangeOptions, (error, results) => {
          resolve(error ? [] : results);
        });
      }),
    ]);

  return (
    stepSamples.length > 0 ||
    basalEnergySamples.length > 0 ||
    activeEnergySamples.length > 0
  );
};

export interface HealthKitAuthorizationResult {
  granted: boolean;
  // True when this attempt failed AND the user already went through this
  // flow at least once before — see hasAttemptedHealthKitConnectBefore's
  // comment for why that combination means retrying again from inside the
  // app can never succeed, no matter how many more times they try: the
  // READ types are already permanently stuck denied from the very first
  // attempt, and only Settings > Health > Data Access & Devices can fix
  // that now. A false-on-the-first-ever-attempt case doesn't set this,
  // since that could still be a one-off glitch worth retrying.
  isStuckAfterPriorDecline: boolean;
}

export const requestHealthKitAuthorization = async (
  userId: string,
): Promise<HealthKitAuthorizationResult> => {
  if (Platform.OS !== "ios") {
    return { granted: false, isStuckAfterPriorDecline: false };
  }

  const attemptedBefore = await hasAttemptedHealthKitConnectBefore(userId);
  await markHealthKitAttempted(userId);

  const request = new Promise<boolean>((resolve) => {
    AppleHealthKit.initHealthKit(permissions, async (error) => {
      const initSucceeded = !error;
      const granted = initSucceeded && (await probeHealthKitReadAccess());
      if (granted) await markHealthKitConnected(userId);
      resolve(granted);
    });
  });

  const granted = await withTimeout(request, 20_000, false);
  return { granted, isStuckAfterPriorDecline: !granted && attemptedBefore };
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

// A day-key ("YYYY-MM-DD", the same format workout logs and food logs use)
// carries no time-of-day, but every HealthKit write needs a real
// start/end. Today's entries anchor to the actual current time (the
// realistic case — logging right after eating/training); anything backfilled
// to a past day has no true time-of-day to recover, so it anchors to a fixed
// early-evening time rather than implying a precision the app doesn't have.
const anchorTimeForDate = (dateKey: string): Date => {
  const todayKey = new Date().toISOString().slice(0, 10);
  if (dateKey === todayKey) return new Date();
  return new Date(`${dateKey}T18:00:00`);
};

// react-native-health's index.d.ts under-declares this call — the native
// side (RCTAppleHealthKit+Methods_Workout.m) also reads `duration` (seconds),
// `energyBurned`/`energyBurnedUnit`, and `distance`/`distanceUnit` from the
// same options object, none of which HealthActivityOptions's type includes.
interface WorkoutSaveOptions {
  type: string;
  startDate: string;
  endDate: string;
  duration?: number;
  energyBurned?: number;
  energyBurnedUnit?: string;
  distance?: number;
  distanceUnit?: string;
}

const saveWorkoutToHealthKit = async (
  userId: string,
  options: WorkoutSaveOptions,
): Promise<void> => {
  if (Platform.OS !== "ios") return;
  if (!(await hasCompletedHealthKitConnect(userId))) return;

  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.saveWorkout(options as any, (error) => {
      if (error) console.warn("Failed to save workout to HealthKit:", error);
      resolve();
    });
  });
};

const CARDIO_ACTIVITY_TO_HEALTHKIT: Record<"walk" | "run" | "bike", string> = {
  walk: "Walking",
  run: "Running",
  bike: "Cycling",
};

export const saveCardioSessionToHealthKit = async (
  userId: string,
  session: {
    activityType: "walk" | "run" | "bike";
    startedAt: string;
    endedAt: string;
    distanceMeters: number;
    caloriesBurned: number | null;
    stepCount: number | null;
  },
): Promise<void> => {
  await saveWorkoutToHealthKit(userId, {
    type: CARDIO_ACTIVITY_TO_HEALTHKIT[session.activityType],
    startDate: session.startedAt,
    endDate: session.endedAt,
    distance: session.distanceMeters,
    distanceUnit: "meter",
    ...(session.caloriesBurned != null && {
      energyBurned: session.caloriesBurned,
      energyBurnedUnit: "kilocalorie",
    }),
  });

  // A separate write, not part of the workout itself — HealthKit tracks
  // step count as its own quantity type, so the session's stepCount (when
  // the device's pedometer captured one) is written independently,
  // scoped to the same start/end window as the workout.
  if (session.stepCount != null && session.stepCount > 0) {
    if (Platform.OS !== "ios") return;
    if (!(await hasCompletedHealthKitConnect(userId))) return;

    const stepOptions: HealthValueOptions = {
      value: session.stepCount,
      startDate: session.startedAt,
      endDate: session.endedAt,
    };
    await new Promise<void>((resolve) => {
      AppleHealthKit.saveSteps(stepOptions, (error) => {
        if (error) console.warn("Failed to save steps to HealthKit:", error);
        resolve();
      });
    });
  }
};

// No real start/end time (or calorie burn) exists for a standalone
// strength log — duration and calories are both rough estimates rather
// than measurements: ~90s working + ~90s resting per set (floored at 10
// minutes) for duration, and ~6 kcal/min (a commonly-cited average for
// moderate resistance training) for calories. Deliberately approximate,
// not authoritative — see anchorTimeForDate for the same caveat on timing.
const ESTIMATED_SECONDS_PER_SET = 180;
const MIN_STRENGTH_WORKOUT_SECONDS = 600;
const ESTIMATED_KCAL_PER_MINUTE = 6;

export const saveStrengthWorkoutToHealthKit = (
  userId: string,
  workout: { date: string; setCount: number },
): Promise<void> => {
  if (workout.setCount <= 0) return Promise.resolve();

  const endDate = anchorTimeForDate(workout.date);
  const durationSeconds = Math.max(
    MIN_STRENGTH_WORKOUT_SECONDS,
    workout.setCount * ESTIMATED_SECONDS_PER_SET,
  );
  const startDate = new Date(endDate.getTime() - durationSeconds * 1000);
  const estimatedCalories = Math.round(
    (durationSeconds / 60) * ESTIMATED_KCAL_PER_MINUTE,
  );

  return saveWorkoutToHealthKit(userId, {
    type: "TraditionalStrengthTraining",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    duration: durationSeconds,
    energyBurned: estimatedCalories,
    energyBurnedUnit: "kilocalorie",
  });
};

// saveFood writes every nutrient in one HealthKit correlation entry —
// react-native-health's .d.ts types this call as a plain HealthInputOptions,
// but the native side (RCTAppleHealthKit+Methods_Dietary.m) reads
// foodName/mealType/date plus each nutrient (energy in kilocalories,
// everything else in grams) straight off the same options object.
export const saveFoodToHealthKit = (
  userId: string,
  entry: {
    foodName: string;
    mealType: string;
    date: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  },
): Promise<void> => {
  if (Platform.OS !== "ios") return Promise.resolve();

  return hasCompletedHealthKitConnect(userId).then((connected) => {
    if (!connected) return;

    return new Promise<void>((resolve) => {
      AppleHealthKit.saveFood(
        {
          foodName: entry.foodName,
          mealType: entry.mealType,
          date: anchorTimeForDate(entry.date).toISOString(),
          energy: entry.calories,
          protein: entry.proteinG,
          carbohydrates: entry.carbsG,
          fatTotal: entry.fatG,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        (error) => {
          if (error) console.warn("Failed to save food to HealthKit:", error);
          resolve();
        },
      );
    });
  });
};

export const saveBodyMeasurementsToHealthKit = async (
  userId: string,
  measurements: { weightLbs?: number | null; heightInches?: number | null },
): Promise<void> => {
  if (Platform.OS !== "ios") return;
  if (!(await hasCompletedHealthKitConnect(userId))) return;

  const saves: Promise<void>[] = [];

  if (measurements.weightLbs != null) {
    const weightOptions: HealthValueOptions = {
      value: measurements.weightLbs,
      unit: "pound" as HealthValueOptions["unit"],
    };
    saves.push(
      new Promise((resolve) => {
        AppleHealthKit.saveWeight(weightOptions, (error) => {
          if (error) console.warn("Failed to save weight to HealthKit:", error);
          resolve();
        });
      }),
    );
  }

  if (measurements.heightInches != null) {
    const heightOptions: HealthValueOptions = {
      value: measurements.heightInches,
      unit: "inch" as HealthValueOptions["unit"],
    };
    saves.push(
      new Promise((resolve) => {
        AppleHealthKit.saveHeight(heightOptions, (error) => {
          if (error) console.warn("Failed to save height to HealthKit:", error);
          resolve();
        });
      }),
    );
  }

  await Promise.all(saves);
};

// Generic helpers for the read-only overview below — every call here
// already tolerates its own failure (a type the user never granted, or one
// with no data yet) by resolving a safe fallback instead of throwing, so
// one missing metric never blocks the rest of the overview from loading.
const getValue = (
  fn: (
    options: HealthInputOptions,
    callback: (error: string, results: HealthValue) => void,
  ) => void,
  options: HealthInputOptions,
): Promise<number | null> =>
  new Promise((resolve) => {
    fn(options, (error, result) => resolve(error || !result ? null : result.value));
  });

const getSamples = (
  fn: (
    options: HealthInputOptions,
    callback: (error: string, results: HealthValue[]) => void,
  ) => void,
  options: HealthInputOptions,
): Promise<HealthValue[]> =>
  new Promise((resolve) => {
    fn(options, (error, results) => resolve(error ? [] : results));
  });

const getLatestValue = (
  fn: (
    options: HealthUnitOptions,
    callback: (error: string, results: HealthValue) => void,
  ) => void,
): Promise<number | null> =>
  new Promise((resolve) => {
    fn({}, (error, result) => resolve(error || !result ? null : result.value));
  });

const sumValues = (samples: HealthValue[]): number =>
  samples.reduce((sum, sample) => sum + sample.value, 0);

const mostRecent = (samples: HealthValue[]): HealthValue | null =>
  samples.length === 0
    ? null
    : samples.reduce((latest, sample) =>
        new Date(sample.endDate) > new Date(latest.endDate) ? sample : latest,
      );

export interface HealthStatsOverview {
  activity: {
    stepsToday: number;
    activeEnergyTodayKcal: number;
    basalEnergyTodayKcal: number;
    exerciseMinutesToday: number;
    standHoursToday: number;
    flightsClimbedToday: number;
    walkingRunningDistanceMetersToday: number;
    cyclingDistanceMetersToday: number;
    swimmingDistanceMetersToday: number;
  };
  vitals: {
    restingHeartRate: number | null;
    heartRateVariability: number | null;
    walkingHeartRateAverage: number | null;
    vo2Max: number | null;
  };
  body: {
    weightLbs: number | null;
    heightInches: number | null;
    bodyFatPercentage: number | null;
    leanBodyMassLbs: number | null;
    bmi: number | null;
  };
  // Sums every returned sleep-analysis segment (in bed, asleep, and awake
  // alike) in the lookback window — HealthKit's exact stage codes vary by
  // iOS version and aren't reliably distinguishable through this library,
  // so this is "time tracked as sleep," not strictly time asleep.
  sleep: {
    lastNightHours: number | null;
  };
}

// Surfaces every read permission already requested above (see the read
// list's comment) that nothing in the app displays anywhere yet.
// stepsToday/activeEnergy/latestHeartRate/caloriesBurned are deliberately
// NOT duplicated here — those already have a home in
// queryRecentHeartRateAndEnergy (used during live cardio/cinematic-mode
// tracking) — actually stepsToday IS included below since that overview is
// scoped to "during a session," not "today as a whole."
export const getHealthStatsOverview = async (): Promise<HealthStatsOverview> => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const todayRange: HealthInputOptions = {
    startDate: startOfToday.toISOString(),
    endDate: now.toISOString(),
  };

  const lookback90 = new Date(now);
  lookback90.setDate(lookback90.getDate() - 90);
  const recentRange: HealthInputOptions = {
    startDate: lookback90.toISOString(),
    endDate: now.toISOString(),
  };

  const sleepLookback = new Date(now);
  sleepLookback.setHours(sleepLookback.getHours() - 24);
  const sleepRange: HealthInputOptions = {
    startDate: sleepLookback.toISOString(),
    endDate: now.toISOString(),
  };

  const [
    stepSamples,
    activeEnergySamples,
    basalEnergySamples,
    exerciseTimeSamples,
    standTimeSamples,
    flightsClimbed,
    walkingRunningDistance,
    cyclingDistance,
    swimmingDistance,
    restingHeartRate,
    hrvSamples,
    walkingHrSamples,
    vo2MaxSamples,
    weight,
    height,
    bodyFatPercentage,
    leanBodyMass,
    bmi,
    sleepSamples,
  ] = await Promise.all([
    getSamples(AppleHealthKit.getDailyStepCountSamples, todayRange),
    getSamples(AppleHealthKit.getActiveEnergyBurned, todayRange),
    getSamples(AppleHealthKit.getBasalEnergyBurned, todayRange),
    getSamples(AppleHealthKit.getAppleExerciseTime, todayRange),
    getSamples(AppleHealthKit.getAppleStandTime, todayRange),
    getValue(AppleHealthKit.getFlightsClimbed, todayRange),
    getValue(AppleHealthKit.getDistanceWalkingRunning, todayRange),
    getValue(AppleHealthKit.getDistanceCycling, todayRange),
    getValue(AppleHealthKit.getDistanceSwimming, todayRange),
    getValue(AppleHealthKit.getRestingHeartRate, recentRange),
    getSamples(AppleHealthKit.getHeartRateVariabilitySamples, recentRange),
    getSamples(AppleHealthKit.getWalkingHeartRateAverage, recentRange),
    getSamples(AppleHealthKit.getVo2MaxSamples, recentRange),
    getLatestValue(AppleHealthKit.getLatestWeight),
    getLatestValue(AppleHealthKit.getLatestHeight),
    getLatestValue(AppleHealthKit.getLatestBodyFatPercentage),
    getLatestValue(AppleHealthKit.getLatestLeanBodyMass),
    getLatestValue(AppleHealthKit.getLatestBmi),
    getSamples(AppleHealthKit.getSleepSamples, sleepRange),
  ]);

  const sleepHours =
    sleepSamples.length === 0
      ? null
      : sleepSamples.reduce(
          (hours, sample) =>
            hours +
            (new Date(sample.endDate).getTime() -
              new Date(sample.startDate).getTime()) /
              3_600_000,
          0,
        );

  return {
    activity: {
      stepsToday: Math.round(sumValues(stepSamples)),
      activeEnergyTodayKcal: Math.round(sumValues(activeEnergySamples)),
      basalEnergyTodayKcal: Math.round(sumValues(basalEnergySamples)),
      exerciseMinutesToday: Math.round(sumValues(exerciseTimeSamples)),
      standHoursToday: Math.round(sumValues(standTimeSamples)),
      flightsClimbedToday: Math.round(flightsClimbed ?? 0),
      walkingRunningDistanceMetersToday: walkingRunningDistance ?? 0,
      cyclingDistanceMetersToday: cyclingDistance ?? 0,
      swimmingDistanceMetersToday: swimmingDistance ?? 0,
    },
    vitals: {
      restingHeartRate: restingHeartRate != null ? Math.round(restingHeartRate) : null,
      heartRateVariability: mostRecent(hrvSamples)?.value ?? null,
      walkingHeartRateAverage: mostRecent(walkingHrSamples)?.value ?? null,
      vo2Max: mostRecent(vo2MaxSamples)?.value ?? null,
    },
    body: {
      weightLbs: weight,
      heightInches: height,
      bodyFatPercentage,
      leanBodyMassLbs: leanBodyMass,
      bmi,
    },
    sleep: {
      lastNightHours: sleepHours != null ? Math.round(sleepHours * 10) / 10 : null,
    },
  };
};
