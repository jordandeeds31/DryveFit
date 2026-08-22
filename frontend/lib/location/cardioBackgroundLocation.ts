import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CardioRoutePoint } from "@/types/cardio.types";

export const CARDIO_LOCATION_TASK = "cardio-background-location";

const PENDING_POINTS_KEY = "cardioSession.pendingRoutePoints";

// Defined at module scope, not inside a component — required by
// expo-task-manager, and critical for the case where iOS relaunches the app
// purely to deliver a background location batch: that relaunch re-evaluates
// every imported module (including this one) before anything else runs, so
// the task has to already be defined by then, not registered lazily inside
// a component's effect that may never mount in that relaunch.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  CARDIO_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.warn("Background location task error:", error);
      return;
    }
    const locations = data?.locations ?? [];
    if (locations.length === 0) return;

    const newPoints: CardioRoutePoint[] = locations.map((location) => ({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      timestamp: location.timestamp,
    }));

    // Appends rather than overwrites — this callback can fire many times
    // before the foreground screen next drains the buffer (see
    // drainPendingRoutePoints below), especially across a full app relaunch
    // where nothing has drained anything yet.
    try {
      const existingRaw = await AsyncStorage.getItem(PENDING_POINTS_KEY);
      const existing: CardioRoutePoint[] = existingRaw
        ? JSON.parse(existingRaw)
        : [];
      await AsyncStorage.setItem(
        PENDING_POINTS_KEY,
        JSON.stringify([...existing, ...newPoints]),
      );
    } catch (err) {
      console.warn("Failed to persist background location points:", err);
    }
  },
);

// Requests "Always" access (on top of foreground access, which iOS requires
// granting first) and starts delivering location updates through the OS's
// background location service — this keeps running while the app is
// backgrounded (phone locked, user switched to another app), unlike a plain
// watchPositionAsync subscription, which iOS suspends shortly after
// backgrounding.
//
// What this can't do: survive the user explicitly force-quitting the app
// (swiping it away in the app switcher). No app on iOS can continue
// receiving standard location updates after that — only very coarse
// "significant location change" or geofence monitoring survives a force
// quit, both far too imprecise for a walk/run route. This is a hard
// platform limit, not something more code can work around.
export const startBackgroundLocationUpdates = async (): Promise<boolean> => {
  const { status: foregroundStatus } =
    await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== "granted") return false;

  const { status: backgroundStatus } =
    await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== "granted") return false;

  await Location.startLocationUpdatesAsync(CARDIO_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,
    timeInterval: 3000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "DryveFit is tracking your activity",
      notificationBody: "Recording your route in the background.",
    },
  });

  return true;
};

export const stopBackgroundLocationUpdates = async (): Promise<void> => {
  const isRegistered =
    await TaskManager.isTaskRegisteredAsync(CARDIO_LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(CARDIO_LOCATION_TASK);
  }
};

// Reads and clears whatever the background task has buffered since the last
// drain — called on mount/focus so points collected while backgrounded (or
// even across a full app relaunch) make it into the visible session instead
// of sitting in storage indefinitely.
export const drainPendingRoutePoints = async (): Promise<
  CardioRoutePoint[]
> => {
  const raw = await AsyncStorage.getItem(PENDING_POINTS_KEY);
  if (!raw) return [];
  await AsyncStorage.removeItem(PENDING_POINTS_KEY);
  try {
    return JSON.parse(raw) as CardioRoutePoint[];
  } catch {
    return [];
  }
};
