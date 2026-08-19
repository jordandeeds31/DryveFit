import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import Feather from "@expo/vector-icons/Feather";
import { useProgramDay, useLogExercisePerformance } from "@/hooks/usePrograms";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { ProgramExercise } from "@/types/programs.types";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatElapsed } from "@/lib/utils/duration.utils";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import type { AppDispatch, RootState } from "@/store";
import {
  startTimerIfNeeded,
  clearTimer,
  setSessionIndex,
  clearSession,
  recordHeartRateSample,
  setCaloriesBurned,
} from "@/store/slices/cinematicTimerSlice";
import {
  isHealthKitAvailable,
  queryRecentHeartRateAndEnergy,
} from "@/lib/health/healthkit";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  displayWeight,
  toStoredLbs,
  weightUnitLabel,
} from "@/lib/utils/units";
import { UnitSystem } from "@/types/user.types";

const HEALTH_POLL_INTERVAL_MS = 30_000;

interface SetEntry {
  id: string;
  weight: string;
  reps: string;
}

const buildDefaultSets = (
  exercise: ProgramExercise,
  unitSystem: UnitSystem,
): SetEntry[] => {
  // Resuming a session: if this exercise was already saved (e.g. via a
  // partial save on a previous X close), restore exactly what was
  // logged instead of starting blank.
  const existingLog = exercise.exerciseLogs?.[0];
  if (existingLog) {
    return existingLog.sets.map((set) => ({
      id: set.id,
      // Stored/loaded in lbs always — converted to the field's display
      // unit here so a metric user edits/sees kg, not raw lbs.
      weight:
        set.weight != null
          ? displayWeight(set.weight, unitSystem).toString()
          : "",
      reps: set.reps?.toString() ?? "",
    }));
  }

  return [
    {
      id: `${exercise.id}-0-${Date.now()}`,
      weight:
        exercise.recommendedWeight != null
          ? displayWeight(exercise.recommendedWeight, unitSystem).toString()
          : "",
      reps: "",
    },
  ];
};

// The proxy fetches the gif from WorkoutX server-side and converts it on
// every uncached request, which isn't instant — without this, the card
// just shows blank space for that gap with no indication anything's
// coming. Keyed by uri from the call site so switching exercises remounts
// this (fresh isLoading=true) instead of carrying over the previous
// exercise's loaded state for a frame.
const CinematicExerciseImage = ({
  uri,
  headers,
}: {
  uri: string;
  headers: Record<string, string>;
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={styles.imagePlaceholder}>
      <Image
        source={{ uri, headers }}
        style={styles.image}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
      {isLoading && (
        <ActivityIndicator
          style={StyleSheet.absoluteFill}
          size="small"
          color="#9CA3AF"
        />
      )}
    </View>
  );
};

const CinematicMode = () => {
  const { programId, date } = useLocalSearchParams<{
    programId: string;
    date: string;
  }>();

  const { data: dayDetail, isLoading, isError } = useProgramDay(
    programId ?? null,
    date ?? null,
  );
  const { mutate: logExercise, isPending } = useLogExercisePerformance();
  const authImageHeaders = useAuthImageHeaders();
  const unitSystem = useUnitSystem();
  const dispatch = useDispatch<AppDispatch>();

  const sessionKey = `${programId}:${date}`;
  const resumeIndex = useSelector(
    (state: RootState) =>
      state.cinematicTimer.currentIndexBySession[sessionKey],
  );

  // Lazy initializer — reads Redux once on mount so a resumed session
  // opens directly on the exercise the user was last on, instead of
  // always starting over at the first one.
  const [currentIndex, setCurrentIndex] = useState(() => resumeIndex ?? 0);
  const [sets, setSets] = useState<SetEntry[]>([]);
  // Forces a re-render every second so the elapsed-time display ticks —
  // the actual elapsed value below is always derived from a real
  // timestamp in Redux, not this counter itself.
  const [, forceTick] = useState(0);

  const exercises: ProgramExercise[] = dayDetail?.exercises ?? [];
  const exercise = exercises[currentIndex];
  const isLastExercise = currentIndex === exercises.length - 1;
  const isBodyweight = exercise?.equipment === "bodyweight";

  const startedAt = useSelector((state: RootState) =>
    exercise
      ? state.cinematicTimer.startedAtByExerciseId[exercise.id]
      : undefined,
  );
  // Closing (X) and coming back doesn't reset this — the timestamp lives
  // in Redux, outside this screen's lifecycle, so elapsed time keeps
  // counting the whole time the screen is closed too, not just while
  // mounted.
  const elapsedSeconds = startedAt
    ? Math.floor((Date.now() - startedAt) / 1000)
    : 0;

  // Approximates when this whole session began (not just the current
  // exercise) as the earliest per-exercise start time recorded so far —
  // there's no separate session-level timestamp in Redux, and this is
  // accurate enough for "since the workout started" HealthKit queries and
  // the recap's total-duration figure.
  const sessionStartedAt = useSelector((state: RootState) => {
    const timestamps = exercises
      .map((ex) => state.cinematicTimer.startedAtByExerciseId[ex.id])
      .filter((t): t is number => t != null);
    return timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
  });

  const healthMetrics = useSelector(
    (state: RootState) =>
      state.cinematicTimer.healthMetricsBySession[sessionKey],
  );

  const [isHealthKitAvailableOnDevice, setIsHealthKitAvailableOnDevice] =
    useState(false);

  // HealthKit deliberately never reveals true read-authorization status to
  // apps, so gating the poll below on an "authorized" check (as this used
  // to) can silently skip it forever even when access really was granted —
  // only real device availability is checked here; the query itself just
  // returns nothing if access truly was denied.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await isHealthKitAvailable();
      if (!cancelled) setIsHealthKitAvailableOnDevice(available);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Polls HealthKit roughly every 30s while a session is active — there's
  // no native Watch app here, so a fresh Watch → Health sync (and thus a
  // new sample) can lag by anywhere from a few seconds to about a minute.
  // This is "most recent reading," not real-time streaming.
  useEffect(() => {
    if (!isHealthKitAvailableOnDevice) return;

    let cancelled = false;
    const poll = async () => {
      const { latestHeartRate, caloriesBurned } =
        await queryRecentHeartRateAndEnergy(new Date(sessionStartedAt));
      if (cancelled) return;
      if (latestHeartRate != null) {
        dispatch(recordHeartRateSample({ sessionKey, bpm: latestHeartRate }));
      }
      dispatch(setCaloriesBurned({ sessionKey, calories: caloriesBurned }));
    };

    poll();
    const interval = setInterval(poll, HEALTH_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isHealthKitAvailableOnDevice, sessionKey, sessionStartedAt, dispatch]);

  useEffect(() => {
    if (exercise) dispatch(startTimerIfNeeded(exercise.id));
  }, [exercise?.id, dispatch]);

  // Keeps WorkoutDetail's "RESUME" vs "START" label (and the index to
  // jump back to) in sync with wherever the user currently is in this
  // session, independent of how they eventually leave the screen.
  useEffect(() => {
    dispatch(setSessionIndex({ sessionKey, index: currentIndex }));
  }, [sessionKey, currentIndex, dispatch]);

  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (exercise) setSets(buildDefaultSets(exercise, unitSystem));
    // unitSystem deliberately excluded — it changing mid-session shouldn't
    // silently rewrite whatever the user's already typed for this set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, exercise?.id]);

  const buildValidSets = () =>
    sets
      .filter(
        (set) =>
          (isBodyweight || set.weight.trim() !== "") &&
          set.reps.trim() !== "",
      )
      .map((set) => ({
        // Always stored in lbs — set.weight is whatever the user typed
        // in their OWN unit system, so it's converted back here
        // regardless of which one that was.
        weight: isBodyweight
          ? null
          : toStoredLbs(parseFloat(set.weight), unitSystem),
        reps: parseInt(set.reps, 10),
      }));

  // A failed save (network hiccup, a stale/expired session, ...) used to
  // leave STOP/X doing nothing — both only ever navigated away inside the
  // mutation's onSuccess, so an error just left the screen sitting there
  // with no feedback and no way out. Being unable to leave this screen is
  // worse than losing an unsaved set, so errors now surface an alert and
  // still let the user out.
  const handleSaveError = () => {
    Alert.alert(
      "Couldn't save your sets",
      "The sets you entered here weren't saved, but you can log them manually from the workout screen.",
    );
  };

  const handleClose = () => {
    if (!exercise) {
      safeGoBack();
      return;
    }

    // Whatever's been entered so far is saved on the way out — even a
    // partial set — so the LOG button on WorkoutDetail reflects IN
    // PROGRESS and reopening the log modal shows exactly what was typed
    // here, instead of silently discarding it.
    const validSets = buildValidSets();

    if (validSets.length === 0) {
      safeGoBack();
      return;
    }

    // Note: the timer is deliberately NOT cleared here — closing via X is
    // "step away," not "finished with this exercise," so the clock keeps
    // running (persisted in Redux) for whenever the user resumes. Only
    // handleDone clears it, since that's the actual "done with this one"
    // action.
    logExercise(
      {
        programExerciseId: exercise.id,
        sets: validSets,
        durationSecs: elapsedSeconds,
      },
      {
        onSuccess: () => {
          safeGoBack();
        },
        onError: () => {
          handleSaveError();
          safeGoBack();
        },
      },
    );
  };

  const handleStop = () => {
    if (!exercise) {
      safeGoBack();
      return;
    }

    // Unlike X, this ends the session entirely — saves whatever's
    // currently entered, then clears the timer and resume state so
    // WorkoutDetail goes back to showing "START" instead of "RESUME".
    // For someone who's decided to just track the rest manually from
    // WorkoutDetail/the log modal instead of continuing cinematic mode.
    const endSession = () => {
      dispatch(clearTimer(exercise.id));
      dispatch(clearSession(sessionKey));
      safeGoBack();
    };

    const validSets = buildValidSets();

    if (validSets.length === 0) {
      endSession();
      return;
    }

    logExercise(
      {
        programExerciseId: exercise.id,
        sets: validSets,
        durationSecs: elapsedSeconds,
      },
      {
        onSuccess: endSession,
        onError: () => {
          handleSaveError();
          endSession();
        },
      },
    );
  };

  const handleUpdateSet = (
    setId: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    setSets((prev) =>
      prev.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
    );
  };

  const handleAddSet = () => {
    if (!exercise) return;
    setSets((prev) => [
      ...prev,
      {
        id: `${exercise.id}-extra-${Date.now()}`,
        weight: exercise.recommendedWeight?.toString() ?? "",
        reps: "",
      },
    ]);
  };

  const handleDeleteSet = (setId: string) => {
    setSets((prev) => prev.filter((set) => set.id !== setId));
  };

  const buildRecapParams = () => {
    const heartRateSamples = healthMetrics?.heartRateSamples ?? [];
    const avgHeartRate =
      heartRateSamples.length > 0
        ? Math.round(
            heartRateSamples.reduce((sum, bpm) => sum + bpm, 0) /
              heartRateSamples.length,
          )
        : null;
    const maxHeartRate =
      heartRateSamples.length > 0 ? Math.max(...heartRateSamples) : null;

    // For every exercise except the one finishing right now, pull the
    // duration already saved by its own DONE action. For the one finishing
    // now, use the elapsed time computed here directly — the mutation that
    // persists it hasn't round-tripped through the programDay query yet.
    const perExercise = exercises.map((ex, index) => ({
      exerciseName: ex.exerciseName,
      durationSecs:
        index === currentIndex
          ? elapsedSeconds
          : (ex.exerciseLogs?.[0]?.sets?.[0]?.durationSecs ?? null),
    }));

    return {
      totalDurationSecs: String(
        Math.floor((Date.now() - sessionStartedAt) / 1000),
      ),
      caloriesBurned: String(Math.round(healthMetrics?.caloriesBurned ?? 0)),
      avgHeartRate: avgHeartRate != null ? String(avgHeartRate) : "",
      maxHeartRate: maxHeartRate != null ? String(maxHeartRate) : "",
      perExercise: JSON.stringify(perExercise),
    };
  };

  const handleDone = () => {
    if (!exercise) return;

    const validSets = buildValidSets();

    const advance = () => {
      dispatch(clearTimer(exercise.id));
      if (isLastExercise) {
        const recapParams = buildRecapParams();
        dispatch(clearSession(sessionKey));
        router.replace({ pathname: "/workout-recap", params: recapParams });
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    };

    if (validSets.length === 0) {
      advance();
      return;
    }

    logExercise(
      {
        programExerciseId: exercise.id,
        sets: validSets,
        durationSecs: elapsedSeconds,
      },
      { onSuccess: advance },
    );
  };

  if (isLoading || isError || !exercise) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleClose}
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.loadingContainer}>
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.errorText}>
              {isError
                ? "Couldn't load this workout. Try again from the workout screen."
                : "Nothing scheduled for this day."}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleStop}
        >
          <Text style={styles.stopText}>STOP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleClose}
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.progress}>
          Exercise {currentIndex + 1} of {exercises.length}
        </Text>
        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
        <Text style={styles.prescription}>
          {exercise.sets} sets × {exercise.reps} reps
          {exercise.recommendedWeight != null
            ? ` @ ${displayWeight(exercise.recommendedWeight, unitSystem)} ${weightUnitLabel(unitSystem)}`
            : ""}
        </Text>
        <Text style={styles.timer}>{formatElapsed(elapsedSeconds)}</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
      >
        {exercise.imageUrl && authImageHeaders ? (
          <CinematicExerciseImage
            key={exercise.id}
            uri={`${process.env.EXPO_PUBLIC_API_URL}${exercise.imageUrl}`}
            headers={authImageHeaders}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={40} color="#4B5563" />
          </View>
        )}

        <View style={styles.setsSection}>
          {sets.map((set, index) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {index + 1}</Text>

              {!isBodyweight && (
                <TextInput
                  style={styles.input}
                  placeholder={`Weight (${weightUnitLabel(unitSystem)})`}
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  value={set.weight}
                  onChangeText={(value) =>
                    handleUpdateSet(set.id, "weight", value)
                  }
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Reps"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={set.reps}
                onChangeText={(value) =>
                  handleUpdateSet(set.id, "reps", value)
                }
              />

              <TouchableOpacity onPress={() => handleDeleteSet(set.id)}>
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addSetButton} onPress={handleAddSet}>
            <Text style={styles.addSetText}>+ ADD SET</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleDone}
        disabled={isPending}
      >
        <Text style={styles.doneButtonText}>
          {isPending ? "SAVING..." : "DONE"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default CinematicMode;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: "#9CA3AF",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stopText: {
    color: "#9CA3AF",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  progress: {
    color: "#9CA3AF",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  exerciseName: {
    color: "white",
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.bold,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  prescription: {
    color: "#9CA3AF",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  timer: {
    color: "white",
    fontSize: fontSizes["4xl"],
    fontWeight: fontWeights.extrabold,
    marginTop: spacing.xs,
    fontVariant: ["tabular-nums"],
  },
  body: {
    flex: 1,
    marginTop: spacing.md,
  },
  bodyContent: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: 14,
  },
  imagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 14,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  setsSection: {
    width: "100%",
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  setLabel: {
    width: 50,
    color: "#9CA3AF",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    color: "white",
    fontSize: fontSizes.sm,
  },
  addSetButton: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  addSetText: {
    color: "#E5E7EB",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  doneButton: {
    backgroundColor: "white",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#0B0F19",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
});
