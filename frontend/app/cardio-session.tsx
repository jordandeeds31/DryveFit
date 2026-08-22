import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import MapView, { Polyline } from "react-native-maps";
import Feather from "@expo/vector-icons/Feather";
import type { AppDispatch, RootState } from "@/store";
import {
  startSession,
  restoreSession,
  addRoutePoint,
  pauseSession,
  resumeSession,
  recordHeartRateSample,
  setCaloriesBurned,
  setStepCount,
  clearSession,
} from "@/store/slices/cardioSessionSlice";
import {
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
  drainPendingRoutePoints,
} from "@/lib/location/cardioBackgroundLocation";
import {
  saveSessionSnapshot,
  loadSessionSnapshot,
  clearSessionSnapshot,
} from "@/lib/location/cardioSessionPersistence";
import { useCreateCardioSession } from "@/hooks/useCardio";
import { useCurrentUser } from "@/hooks/useUsers";
import { CardioActivityType } from "@/types/cardio.types";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatElapsed } from "@/lib/utils/duration.utils";
import {
  isHealthKitAvailable,
  hasCompletedHealthKitConnect,
  queryRecentHeartRateAndEnergy,
} from "@/lib/health/healthkit";
import { cyberpunk, neonGlow, neonShadow } from "@/constants/cyberpunk";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  displayDistance,
  distanceUnitLabel,
  formatPace,
} from "@/lib/utils/units";

const HEALTH_POLL_INTERVAL_MS = 30_000;
const MAP_DELTA = 0.005;

const ACTIVITY_LABELS: Record<CardioActivityType, string> = {
  walk: "Walk",
  run: "Run",
  bike: "Bike Ride",
};

const CardioSessionScreen = () => {
  const { activityType } = useLocalSearchParams<{
    activityType: CardioActivityType;
  }>();
  const dispatch = useDispatch<AppDispatch>();
  const unitSystem = useUnitSystem();
  const { data: currentUser } = useCurrentUser();
  const { mutate: createSession, isPending: isSaving } =
    useCreateCardioSession();

  const active = useSelector((state: RootState) => state.cardioSession.active);
  const isPaused = active?.pausedAt != null;

  const [permissionDenied, setPermissionDenied] = useState(false);
  // "authorized" here is a best-effort hint, not a hard fact — HealthKit
  // deliberately never tells an app whether read access (heart rate,
  // active energy) was actually granted, only write access. A false
  // "not_connected" reading must never block the poll below, or real data
  // silently never gets queried even though it's actually there.
  const [healthKitStatus, setHealthKitStatus] = useState<
    "checking" | "unavailable" | "not_connected" | "connected"
  >("checking");
  const isHealthKitAvailableOnDevice = healthKitStatus !== "unavailable";
  // Forces a re-render every second so elapsed time ticks — the real value
  // is always derived from the startedAt timestamp in Redux, same pattern
  // as cinematic-mode's timer.
  const [, forceTick] = useState(0);

  // Starts (or resumes into) a session exactly once on mount. Order matters:
  // a persisted snapshot (see cardioSessionPersistence.ts) is checked first,
  // since Redux is purely in-memory and a full app relaunch during a
  // backgrounded walk wipes `active` out even though the walk is still in
  // progress — only falls through to a brand new session if there's truly
  // nothing to resume.
  useEffect(() => {
    if (active) return;
    (async () => {
      const snapshot = await loadSessionSnapshot();
      if (snapshot) {
        dispatch(restoreSession(snapshot));
      } else if (activityType) {
        dispatch(startSession(activityType));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Persists the session on every change so it survives the app being
  // fully terminated and relaunched by iOS mid-walk (see the effect above,
  // which reloads this on the next mount) — Redux itself has no persistence
  // layer, so this is the only copy that outlives a killed JS engine.
  useEffect(() => {
    if (active) saveSessionSnapshot(active);
  }, [active]);

  // Starts real background location tracking (not the old foreground-only
  // watchPositionAsync) — this keeps recording GPS points while the phone
  // is locked or the user switches to another app, via iOS's background
  // location service (see cardioBackgroundLocation.ts). It cannot survive
  // the user force-quitting the app from the app switcher — no iOS app can
  // continue receiving location updates after that, only very coarse
  // significant-location-change/geofence monitoring does, which is far too
  // imprecise for a walk/run route.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const started = await startBackgroundLocationUpdates();
      if (!cancelled && !started) setPermissionDenied(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The background task (cardioBackgroundLocation.ts) can't dispatch into
  // Redux directly — it may run in a minimal JS context with no React tree
  // mounted, especially right after iOS relaunches the app to deliver a
  // location batch. It buffers points to disk instead, and this drains
  // that buffer into the visible route: once immediately on mount (picks up
  // anything collected before this screen was there to see it, including
  // across a full relaunch) and then every few seconds while mounted.
  useEffect(() => {
    const drain = async () => {
      const points = await drainPendingRoutePoints();
      points.forEach((point) => dispatch(addRoutePoint(point)));
    };
    drain();
    const interval = setInterval(drain, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      const available = await isHealthKitAvailable();
      if (cancelled) return;
      if (!available) {
        setHealthKitStatus("unavailable");
        return;
      }
      const connected = await hasCompletedHealthKitConnect(currentUser.id);
      if (!cancelled) {
        setHealthKitStatus(connected ? "connected" : "not_connected");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Same 30s-poll pattern as cinematic-mode: no live streaming API here,
  // just "most recent Watch-synced reading" pulled from HealthKit
  // periodically. Samples/calories are dispatched into Redux (not local
  // state) so they survive the screen remounting mid-session, and so an
  // average/max heart rate can be computed from the full history at Finish.
  useEffect(() => {
    if (!isHealthKitAvailableOnDevice || !active) return;

    let cancelled = false;
    const poll = async () => {
      const { latestHeartRate, caloriesBurned: calories, stepCount } =
        await queryRecentHeartRateAndEnergy(new Date(active.startedAt));
      if (cancelled) return;
      if (latestHeartRate != null) {
        dispatch(recordHeartRateSample(latestHeartRate));
      }
      dispatch(setCaloriesBurned(Math.round(calories)));
      dispatch(setStepCount(stepCount));
    };

    poll();
    const interval = setInterval(poll, HEALTH_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHealthKitAvailableOnDevice, active?.startedAt]);

  if (!active) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="white" />
      </SafeAreaView>
    );
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor(
      ((isPaused ? active.pausedAt! : Date.now()) -
        active.startedAt -
        active.totalPausedMs) /
        1000,
    ),
  );

  const latestPoint = active.routePoints[active.routePoints.length - 1];

  const handleTogglePause = () => {
    dispatch(isPaused ? resumeSession() : pauseSession());
  };

  const handleDiscard = () => {
    Alert.alert(
      "Discard this activity?",
      "Your route and distance for this session will not be saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            stopBackgroundLocationUpdates();
            clearSessionSnapshot();
            dispatch(clearSession());
            router.back();
          },
        },
      ],
    );
  };

  const handleFinish = () => {
    stopBackgroundLocationUpdates();
    clearSessionSnapshot();

    if (active.routePoints.length < 2) {
      dispatch(clearSession());
      router.back();
      return;
    }

    const startedAtIso = new Date(active.startedAt).toISOString();
    const endedAtIso = new Date().toISOString();
    const distanceMeters = active.distanceMeters;
    const durationSecs = elapsedSeconds;
    const caloriesBurned = active.caloriesBurned > 0 ? active.caloriesBurned : null;
    const stepCount = active.stepCount > 0 ? active.stepCount : null;
    const avgHeartRate =
      active.heartRateSamples.length > 0
        ? Math.round(
            active.heartRateSamples.reduce((sum, bpm) => sum + bpm, 0) /
              active.heartRateSamples.length,
          )
        : null;
    const maxHeartRate =
      active.heartRateSamples.length > 0
        ? Math.max(...active.heartRateSamples)
        : null;

    createSession(
      {
        activityType: active.activityType,
        startedAt: startedAtIso,
        endedAt: endedAtIso,
        distanceMeters,
        caloriesBurned,
        avgHeartRate,
        maxHeartRate,
        stepCount,
        route: active.routePoints,
      },
      {
        onSuccess: () => {
          dispatch(clearSession());
          router.replace({
            pathname: "/cardio-recap",
            params: {
              activityType: active.activityType,
              durationSecs: String(durationSecs),
              distanceMeters: String(distanceMeters),
              caloriesBurned: caloriesBurned != null ? String(caloriesBurned) : "",
              avgHeartRate: avgHeartRate != null ? String(avgHeartRate) : "",
              maxHeartRate: maxHeartRate != null ? String(maxHeartRate) : "",
              stepCount: stepCount != null ? String(stepCount) : "",
            },
          });
        },
        onError: () => {
          Alert.alert("Couldn't save activity", "Please try again.");
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleDiscard}
        >
          <Feather name="x" size={24} color={colors.dangerRed} />
        </TouchableOpacity>
        <Text style={styles.activityLabel}>
          {ACTIVITY_LABELS[active.activityType]}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {healthKitStatus === "not_connected" && (
        <TouchableOpacity
          style={styles.watchHint}
          onPress={() => router.push("/(tabs)/Profile")}
        >
          <Feather name="heart" size={14} color={colors.textMuted} />
          <Text style={styles.watchHintText}>
            Connect Apple Health in Profile to track heart rate, calories,
            and steps.
          </Text>
          <Feather name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* HealthKit only samples heart rate/calories/steps sparsely in the
          background — an active Watch workout is what makes those readings
          near-continuous. Hidden once real data starts coming in, since the
          nudge is only useful before that happens. Shown regardless of the
          (unreliable) "connected" hint — the poll runs either way, so this
          stays relevant whether the real blocker is a denied permission or
          just no Watch workout running. */}
      {isHealthKitAvailableOnDevice &&
        active.heartRateSamples.length === 0 &&
        active.caloriesBurned === 0 &&
        active.stepCount === 0 && (
          <View style={styles.watchHint}>
            <Feather name="watch" size={14} color={colors.textMuted} />
            <Text style={styles.watchHintText}>
              For live heart rate, calories, and steps, start a workout on
              your Apple Watch too.
            </Text>
          </View>
        )}

      <View style={styles.mapContainer}>
        {permissionDenied ? (
          <View style={styles.permissionDenied}>
            <Feather name="map-pin" size={28} color={colors.textMuted} />
            <Text style={styles.permissionDeniedText}>
              Location access is required to track your route. Enable it in
              Settings to continue.
            </Text>
            <TouchableOpacity
              style={styles.openSettingsButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.openSettingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapView
            style={StyleSheet.absoluteFill}
            showsUserLocation
            userInterfaceStyle="dark"
            region={
              latestPoint
                ? {
                    latitude: latestPoint.lat,
                    longitude: latestPoint.lng,
                    latitudeDelta: MAP_DELTA,
                    longitudeDelta: MAP_DELTA,
                  }
                : undefined
            }
          >
            {active.routePoints.length > 1 && (
              <>
                {/* Wide, translucent under-layer simulates a neon glow —
                    RN has no real blur filter for map overlays. */}
                <Polyline
                  coordinates={active.routePoints.map((p) => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor="rgba(0, 246, 255, 0.35)"
                  strokeWidth={14}
                />
                <Polyline
                  coordinates={active.routePoints.map((p) => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor={cyberpunk.neonCyan}
                  strokeWidth={4}
                />
              </>
            )}
          </MapView>
        )}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatElapsed(elapsedSeconds)}</Text>
          <Text style={styles.statLabel}>time</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {displayDistance(active.distanceMeters, unitSystem).toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>
            {unitSystem === "metric" ? "km" : "miles"}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {formatPace(active.distanceMeters, elapsedSeconds, unitSystem)}
          </Text>
          <Text style={styles.statLabel}>
            pace /{distanceUnitLabel(unitSystem)}
          </Text>
        </View>
        {active.caloriesBurned > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{active.caloriesBurned}</Text>
            <Text style={styles.statLabel}>calories</Text>
          </View>
        )}
        {active.stepCount > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{active.stepCount}</Text>
            <Text style={styles.statLabel}>steps</Text>
          </View>
        )}
        {active.heartRateSamples.length > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {active.heartRateSamples[active.heartRateSamples.length - 1]}
            </Text>
            <Text style={styles.statLabel}>bpm</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={handleTogglePause}
        >
          <Feather
            name={isPaused ? "play" : "pause"}
            size={22}
            color={colors.primaryBlue}
          />
          <Text style={styles.pauseButtonText}>
            {isPaused ? "Resume" : "Pause"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.finishButton}
          onPress={handleFinish}
          disabled={isSaving}
        >
          <Text style={styles.finishButtonText}>
            {isSaving ? "Saving..." : "Finish"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CardioSessionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  activityLabel: {
    color: "white",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  watchHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#111",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  watchHintText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  mapContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#222",
  },
  permissionDenied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    backgroundColor: "#111",
  },
  permissionDeniedText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  openSettingsButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  openSettingsButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: spacing.md,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  statBox: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    color: "white",
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  controlsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: "#000",
  },
  pauseButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingVertical: spacing.md,
    backgroundColor: "#111",
  },
  pauseButtonText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  // The one cyberpunk-blue accent on this screen — same blue as the rest
  // of the app (colors.primaryBlue), just lit up with a neon glow.
  finishButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.md,
    ...neonShadow(colors.primaryBlue, 14),
  },
  finishButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
    ...neonGlow(colors.primaryBlue, 8),
  },
});
