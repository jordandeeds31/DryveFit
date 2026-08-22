import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CardioRoutePoint } from "@/types/cardio.types";
import { haversineDistanceMeters } from "@/lib/utils/geo.utils";
import {
  loadSessionSnapshot,
  saveSessionSnapshot,
} from "@/lib/location/cardioSessionPersistence";
import { queryRecentHeartRateAndEnergy } from "@/lib/health/healthkit";
import { displayDistance, distanceUnitLabel, formatPace } from "@/lib/utils/units";
import { updateCardioLiveActivity } from "@/modules/live-activity";

export const CARDIO_LOCATION_TASK = "cardio-background-location";

// Throttles the HealthKit poll to roughly the same 30s cadence the
// foreground screen used to poll at on its own — this task callback fires
// far more often (every ~3s/5m per startLocationUpdatesAsync's config
// below), and querying HealthKit on every single one of those would be
// wasteful. Persisted to AsyncStorage rather than kept as module-scope
// state, since iOS can hand this callback a brand new headless JS context
// on any given invocation — in-memory state wouldn't reliably survive
// between calls the way a real interval timer's closure would.
const LAST_HEALTH_POLL_KEY = "cardioSession.lastHealthPollAtMs";
const HEALTH_POLL_INTERVAL_MS = 30_000;

// This is the single place session state (distance/route/calories/steps/
// heart rate) gets computed now — previously this task only queued raw
// points for the foreground screen to drain and accumulate itself, which
// meant none of it updated while the screen wasn't mounted. Now it reads
// and writes the same AsyncStorage snapshot the foreground screen reads
// from (see cardioSessionPersistence.ts), so the numbers stay live
// (and the Lock Screen Live Activity gets updated) regardless of whether
// the app is open. Defined at module scope, not inside a component —
// required by expo-task-manager, and critical for the case where iOS
// relaunches the app purely to deliver a background location batch: that
// relaunch re-evaluates every imported module (including this one) before
// anything else runs, so the task has to already be defined by then, not
// registered lazily inside a component's effect that may never mount in
// that relaunch.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  CARDIO_LOCATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.warn("Background location task error:", error);
      return;
    }
    const locations = data?.locations ?? [];
    if (locations.length === 0) return;

    const snapshot = await loadSessionSnapshot();
    // No active session to attribute these points to (e.g. a stray
    // delivery right after Finish/Discard already cleared the snapshot,
    // racing with stopLocationUpdatesAsync) — nothing to do.
    if (!snapshot) return;

    const newPoints: CardioRoutePoint[] = locations.map((location) => ({
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      timestamp: location.timestamp,
    }));

    // Mirrors addRoutePoint's old paused-is-a-no-op behavior — route/
    // distance stay frozen while paused, only resuming accumulation once
    // the session is un-paused again.
    if (snapshot.pausedAt == null) {
      for (const point of newPoints) {
        const lastPoint = snapshot.routePoints[snapshot.routePoints.length - 1];
        if (lastPoint) {
          snapshot.distanceMeters += haversineDistanceMeters(lastPoint, point);
        }
        snapshot.routePoints.push(point);
      }
    }

    let lastPollAtMs = 0;
    try {
      const raw = await AsyncStorage.getItem(LAST_HEALTH_POLL_KEY);
      lastPollAtMs = raw ? Number(raw) : 0;
    } catch {
      // Fall through with lastPollAtMs = 0 — worst case this polls a bit
      // more often than intended, never less.
    }

    if (Date.now() - lastPollAtMs >= HEALTH_POLL_INTERVAL_MS) {
      try {
        const { latestHeartRate, caloriesBurned, stepCount } =
          await queryRecentHeartRateAndEnergy(new Date(snapshot.startedAt));
        if (latestHeartRate != null) {
          snapshot.heartRateSamples.push(latestHeartRate);
        }
        snapshot.caloriesBurned = Math.round(caloriesBurned);
        snapshot.stepCount = stepCount;
        await AsyncStorage.setItem(LAST_HEALTH_POLL_KEY, String(Date.now()));
      } catch (err) {
        // HealthKit's behavior when queried from this headless-relaunch
        // context hasn't been verified against every device/OS
        // combination — failing this poll should never take down route
        // tracking, which is why it's a separate try/catch from the
        // distance math above.
        console.warn("Background HealthKit poll failed:", err);
      }
    }

    await saveSessionSnapshot(snapshot);

    // Best-effort — a failed/no-op Live Activity update (e.g. iOS < 16.1,
    // or the user never granted the "Allow Live Activities" permission)
    // should never affect the actual session tracking above, which is why
    // this is last and separately guarded.
    try {
      const elapsedMs = snapshot.pausedAt != null
        ? snapshot.pausedAt - snapshot.startedAt - snapshot.totalPausedMs
        : Date.now() - snapshot.startedAt - snapshot.totalPausedMs;
      const unit = distanceUnitLabel(snapshot.unitSystem);
      await updateCardioLiveActivity({
        startedAtMs: snapshot.startedAt,
        pausedAtMs: snapshot.pausedAt ?? undefined,
        totalPausedSeconds: snapshot.totalPausedMs / 1000,
        distanceText: `${displayDistance(snapshot.distanceMeters, snapshot.unitSystem).toFixed(2)} ${unit}`,
        paceText: `${formatPace(snapshot.distanceMeters, Math.max(0, Math.floor(elapsedMs / 1000)), snapshot.unitSystem)} /${unit}`,
        caloriesBurned: snapshot.caloriesBurned,
        stepCount: snapshot.stepCount,
        currentHeartRate:
          snapshot.heartRateSamples[snapshot.heartRateSamples.length - 1],
      });
    } catch (err) {
      console.warn("Failed to update cardio Live Activity:", err);
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
  await AsyncStorage.removeItem(LAST_HEALTH_POLL_KEY);
};
