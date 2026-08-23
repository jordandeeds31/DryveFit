import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import MapView, { Polyline } from "react-native-maps";
import * as Location from "expo-location";
import Feather from "@expo/vector-icons/Feather";
import type { AppDispatch, RootState } from "@/store";
import {
  startSession,
  restoreSession,
  pauseSession,
  resumeSession,
  clearSession,
} from "@/store/slices/cardioSessionSlice";
import {
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
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
} from "@/lib/health/healthkit";
import { cyberpunk, neonGlow, neonShadow } from "@/constants/cyberpunk";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  displayDistance,
  distanceUnitLabel,
  formatPace,
} from "@/lib/utils/units";
import {
  isLiveActivitySupported,
  startCardioLiveActivity,
  endCardioLiveActivity,
} from "@/modules/live-activity";

const MAP_DELTA = 0.005;

const ACTIVITY_LABELS: Record<CardioActivityType, string> = {
  walk: "Walk",
  run: "Run",
  bike: "Bike Ride",
};

const CardioSessionScreen = () => {
  const { activityType, action } = useLocalSearchParams<{
    activityType: CardioActivityType;
    // Set by the Live Activity's Finish button (a plain deep link, see
    // targets/cardio-live-activity/CardioLiveActivityWidget.swift) —
    // triggers the same handleFinish flow tapping Finish in-app does.
    action?: string;
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
        dispatch(startSession({ activityType, unitSystem }));
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

  // The background watcher's first delivery can take a while to show up —
  // it's configured for BestForNavigation accuracy (see
  // cardioBackgroundLocation.ts), which needs a full GPS lock rather than
  // a quick network/cached fix, so the map and stats bar can otherwise sit
  // empty for several seconds with zero feedback. This grabs one fast,
  // lower-accuracy fix as soon as permissions are granted purely to seed
  // the very first route point, so the map centers and the "Finding your
  // location" banner below clears quickly instead of waiting on the
  // background task's own first (slower, but more precise) fix.
  useEffect(() => {
    if (!active || active.routePoints.length > 0 || permissionDenied) return;
    let cancelled = false;

    (async () => {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const snapshot = await loadSessionSnapshot();
        if (!snapshot || snapshot.routePoints.length > 0) return;
        snapshot.routePoints.push({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          timestamp: location.timestamp,
        });
        await saveSessionSnapshot(snapshot);
        if (!cancelled) dispatch(restoreSession(snapshot));
      } catch (err) {
        console.warn("Failed to get an initial location fix:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.startedAt, permissionDenied]);

  // The background task (cardioBackgroundLocation.ts) is now the sole
  // place distance/route/calories/steps/heart-rate actually get computed
  // — it can't dispatch into Redux directly (it may run in a minimal JS
  // context with no React tree mounted, especially right after iOS
  // relaunches the app to deliver a location batch), so it writes
  // straight to the persisted snapshot instead. This effect just
  // periodically re-reads that snapshot into Redux so the UI reflects
  // whatever the background task has already computed — once immediately
  // on mount, every few seconds while mounted, and immediately again on
  // returning to the foreground (rather than waiting up to 5s for the
  // interval, since a lot can happen while this screen wasn't visible).
  useEffect(() => {
    let cancelled = false;
    const reload = async () => {
      const snapshot = await loadSessionSnapshot();
      if (!cancelled && snapshot) dispatch(restoreSession(snapshot));
    };
    reload();
    const interval = setInterval(reload, 5000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [dispatch]);

  // Starts (or, on a relaunch, re-attaches to) the Lock Screen Live
  // Activity for this session. Safe to fire on every startedAt/activityType
  // change rather than guard against duplicate calls here — the native
  // side (LiveActivityModule.swift) already checks for an existing Activity
  // of this type first and re-attaches instead of creating a second one.
  useEffect(() => {
    if (!active || !isLiveActivitySupported()) return;
    startCardioLiveActivity(active.activityType, active.startedAt).catch(
      (err) => console.warn("Failed to start cardio Live Activity:", err),
    );
  }, [active?.activityType, active?.startedAt]);

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

  // handleTogglePause/handleDiscard/handleFinish are declared here (above
  // the `if (!active)` guard below) rather than after it, each with their
  // own internal `if (!active) return` — the Finish deep-link effect further
  // down needs to call handleFinish from a hook, and hooks can't come after
  // a conditional return.
  const handleTogglePause = useCallback(() => {
    dispatch(isPaused ? resumeSession() : pauseSession());
  }, [dispatch, isPaused]);

  const handleDiscard = useCallback(() => {
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
            endCardioLiveActivity();
            clearSessionSnapshot();
            dispatch(clearSession());
            router.back();
          },
        },
      ],
    );
  }, [dispatch]);

  const elapsedSeconds = active
    ? Math.max(
        0,
        Math.floor(
          ((isPaused ? active.pausedAt! : Date.now()) -
            active.startedAt -
            active.totalPausedMs) /
            1000,
        ),
      )
    : 0;

  const handleFinish = useCallback(() => {
    if (!active) return;
    stopBackgroundLocationUpdates();
    endCardioLiveActivity();
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
  }, [active, elapsedSeconds, dispatch, createSession]);

  // The Live Activity's Finish button deep-links back in with
  // ?action=finish — same handleFinish flow as tapping Finish in-app
  // (which has no confirmation dialog either, so none is added here for
  // consistency). Clears the param afterward so backgrounding/foregrounding
  // again without a fresh tap doesn't re-trigger it.
  useEffect(() => {
    if (action === "finish" && active) {
      handleFinish();
      router.setParams({ action: "" });
    }
  }, [action, active, handleFinish]);

  if (!active) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="white" />
      </SafeAreaView>
    );
  }

  const latestPoint = active.routePoints[active.routePoints.length - 1];

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
        {!permissionDenied && active.routePoints.length === 0 && (
          <View style={styles.acquiringBanner} pointerEvents="none">
            <ActivityIndicator color={cyberpunk.neonCyan} size="small" />
            <Text style={styles.acquiringText}>
              Finding your location… {elapsedSeconds}s
            </Text>
          </View>
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
  acquiringBanner: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: spacing.sm,
  },
  acquiringText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    fontVariant: ["tabular-nums"],
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
