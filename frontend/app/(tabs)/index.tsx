import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import {
  clearPendingWorkout,
  PendingWorkoutExercise,
} from "@/store/slices/pendingWorkoutSlice";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import NoPrograms from "@/components/shared/NoPrograms/NoPrograms";
import { usePrograms, useSchedule, useProgramDay } from "@/hooks/usePrograms";
import { useWorkoutLogsForDate } from "@/hooks/useWorkoutLogs";
import { getWeekDates, toDateKey, startOfDay } from "@/lib/utils/date.utils";
import WeeklySchedule from "@/features/WeeklySchedule/WeeklySchedule";
import { ScheduleEntry } from "@/types/programs.types";
import WorkoutDetail from "@/features/WorkoutDetail/WorkoutDetail";
import WorkoutLogger from "@/features/WorkoutLogger/WorkoutLogger";
import { WorkoutLoggerHandle } from "@/features/WorkoutLogger/WorkoutLogger.types";
import WorkoutLogSummary from "@/features/WorkoutLogger/WorkoutLogSummary";
import { ensureProAccess } from "@/lib/purchases/requirePro";
import ActiveWorkoutBanner from "@/components/shared/ActiveWorkoutBanner/ActiveWorkoutBanner";
import Toast from "@/components/shared/Toast/Toast";
import Feed from "@/features/Feed/Feed";

const HomeScreen = () => {
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWorkoutLoggerModalOpen, setIsWorkoutLoggerModalOpen] =
    useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<"workouts" | "feed">("workouts");
  const [prefillExercises, setPrefillExercises] = useState<
    PendingWorkoutExercise[] | undefined
  >(undefined);
  const [isWorkoutFormDirty, setIsWorkoutFormDirty] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const workoutLoggerRef = useRef<WorkoutLoggerHandle>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  const isWorkoutLoggerModalOpenRef = useRef(isWorkoutLoggerModalOpen);
  isWorkoutLoggerModalOpenRef.current = isWorkoutLoggerModalOpen;

  // react-native-keyboard-controller's keyboard events are global, so
  // Home's own KeyboardAwareScrollView reacts to the workout modal's
  // keyboard too, even though none of Home's own inputs are involved —
  // its internal scroll-position correction for that (unrelated) keyboard
  // event can land after ours if we react to modal-close alone, leaving a
  // stale scroll position (visible as blank space above the "working out
  // right now" banner). Listening for the keyboard's own hide event and
  // waiting past its ~250-300ms hide animation lets our reset win the race.
  // Scoped to only while the workout modal is open so this doesn't fight
  // the legitimate scroll-into-view behavior for WorkoutDetail's own
  // inline set-logging inputs, which aren't affected by this bug.
  useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidHide", () => {
      if (!isWorkoutLoggerModalOpenRef.current) return;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 350);
    });
    return () => subscription.remove();
  }, []);

  const dispatch = useDispatch<AppDispatch>();
  const pendingWorkoutExercises = useSelector(
    (state: RootState) => state.pendingWorkout.exercises,
  );

  // A workout inherited from someone's profile while the viewer had no
  // active program lands here via Redux (see pendingWorkoutSlice) rather
  // than route params — captured into local state immediately so it
  // survives the dispatch(clearPendingWorkout()) below; reading the
  // Redux value directly in WorkoutLogger's initial render would already
  // see it cleared by the time that render happens.
  useEffect(() => {
    if (pendingWorkoutExercises) {
      setPrefillExercises(pendingWorkoutExercises);
      setIsWorkoutLoggerModalOpen(true);
      dispatch(clearPendingWorkout());
    }
  }, [pendingWorkoutExercises, dispatch]);

  const handleCloseWorkoutLogger = (value: boolean) => {
    setIsWorkoutLoggerModalOpen(value);
    if (!value) {
      setPrefillExercises(undefined);
      setIsWorkoutFormDirty(false);
      // The modal's own keyboard events are global, so Home's background
      // KeyboardAwareScrollView reacts to them too even though none of its
      // own inputs were involved — closing the modal can leave it scrolled
      // to a stale, incorrect position (visible as blank space above the
      // "working out right now" banner). Snap it back to the top.
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const { data: programs, isLoading: isProgramsLoading } = usePrograms();
  const { data: schedule } = useSchedule();

  const weekDates = getWeekDates(referenceDate);

  const activeProgram = programs?.find((program) => program.isActive) ?? null;
  const hasPrograms = !!programs && programs.length > 0;

  // Nothing exists before the user's earliest program, so there's no reason
  // to let them page back past the week it starts in.
  const earliestProgramStartDate =
    programs && programs.length > 0
      ? new Date(
          Math.min(...programs.map((p) => new Date(p.startDate).getTime())),
        )
      : null;

  const earliestWeekStart = earliestProgramStartDate
    ? startOfDay(getWeekDates(earliestProgramStartDate)[0])
    : null;

  // Standalone workout logs can predate every program (or exist when the
  // user has none at all) — the boundary needs to reach back to those
  // weeks too, or a workout logged outside a program becomes unreachable.
  // entry.date is a "YYYY-MM-DD" key, parsed from components (not `new
  // Date(str)`) since that string is a UTC-midnight ISO date and local
  // getters on it can roll the calendar day back a day west of UTC.
  const earliestStandaloneLogDate = (schedule ?? []).reduce(
    (earliest: Date | null, entry) => {
      if (!entry.hasStandaloneLog) return earliest;
      const [year, month, day] = entry.date.split("-").map(Number);
      const entryDate = new Date(year, month - 1, day);
      return !earliest || entryDate.getTime() < earliest.getTime()
        ? entryDate
        : earliest;
    },
    null,
  );

  const earliestStandaloneWeekStart = earliestStandaloneLogDate
    ? startOfDay(getWeekDates(earliestStandaloneLogDate)[0])
    : null;

  // The user should always be able to page back at least as far as the
  // week containing today — e.g. to check a standalone-logged workout from
  // earlier in the week — even if every program they have starts later
  // (viewing a future program's first week shouldn't trap them there). A
  // program, or a standalone log, that predates today can still push the
  // boundary back further, so take whichever of the three is earliest.
  const todayWeekStart = startOfDay(getWeekDates(new Date())[0]);
  const earliestAllowedWeekStart = [
    earliestWeekStart,
    earliestStandaloneWeekStart,
  ].reduce<Date>(
    (earliest, candidate) =>
      candidate && candidate.getTime() < earliest.getTime()
        ? candidate
        : earliest,
    todayWeekStart,
  );

  const canGoToPreviousWeek =
    startOfDay(weekDates[0]).getTime() > earliestAllowedWeekStart.getTime();

  // Mirror of the above: nothing exists after the user's latest program
  // ends, so there's no reason to let them page forward past its week.
  const latestProgramEndDate =
    programs && programs.length > 0
      ? new Date(
          Math.max(...programs.map((p) => new Date(p.endDate).getTime())),
        )
      : null;

  const latestWeekStart = latestProgramEndDate
    ? startOfDay(getWeekDates(latestProgramEndDate)[0])
    : null;

  const canGoToNextWeek =
    hasPrograms &&
    (!latestWeekStart ||
      startOfDay(weekDates[0]).getTime() < latestWeekStart.getTime());

  const isCurrentProgramWeek =
    !!activeProgram &&
    weekDates.some((date) => {
      const day = startOfDay(date).getTime();
      return (
        day >= startOfDay(new Date(activeProgram.startDate)).getTime() &&
        day <= startOfDay(new Date(activeProgram.endDate)).getTime()
      );
    });

  const scheduleMap = (schedule ?? []).reduce(
    (acc, entry) => {
      acc[entry.date] = entry;
      return acc;
    },
    {} as Record<string, ScheduleEntry>,
  );

  const selectedDateKey = toDateKey(selectedDate);

  const selectedScheduleEntry = scheduleMap[selectedDateKey];

  const selectedProgramId =
    selectedScheduleEntry?.programDays[0]?.programId ?? null;

  const { data: dayDetail, isLoading: isDayDetailLoading } = useProgramDay(
    selectedProgramId,
    selectedDateKey,
  );

  const { data: workoutLogs, isLoading: isWorkoutLogsLoading } =
    useWorkoutLogsForDate(selectedDateKey);

  const hasLoggedStandaloneWorkout = (workoutLogs ?? []).length > 0;

  // Combined flag — true while EITHER query is refetching for the newly
  // selected date, so we show exactly one spinner instead of two, and
  // never briefly render the "no workout" empty state before data settles.
  const isSwitchingDay = isDayDetailLoading || isWorkoutLogsLoading;

  useEffect(() => {
    setIsWorkoutLoggerModalOpen(false);
    setPrefillExercises(undefined);
    setIsWorkoutFormDirty(false);
  }, [selectedDateKey]);

  const goToNextWeek = () => {
    if (!canGoToNextWeek) return;
    const nextDate = new Date(referenceDate);
    nextDate.setDate(referenceDate.getDate() + 7);
    setReferenceDate(nextDate);
  };

  const goToPreviousWeek = () => {
    if (!canGoToPreviousWeek) return;
    const prevDate = new Date(referenceDate);
    prevDate.setDate(referenceDate.getDate() - 7);
    setReferenceDate(prevDate);
  };

  const handleLogWorkout = async () => {
    const granted = await ensureProAccess();
    if (granted) setIsWorkoutLoggerModalOpen(true);
  };

  if (isProgramsLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.homeTabBar}>
        <TouchableOpacity
          style={[
            styles.homeTab,
            homeTab === "workouts" && styles.homeTabActive,
          ]}
          onPress={() => setHomeTab("workouts")}
        >
          <Text
            style={[
              styles.homeTabText,
              homeTab === "workouts" && styles.homeTabTextActive,
            ]}
          >
            Workouts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.homeTab, homeTab === "feed" && styles.homeTabActive]}
          onPress={() => setHomeTab("feed")}
        >
          <Text
            style={[
              styles.homeTabText,
              homeTab === "feed" && styles.homeTabTextActive,
            ]}
          >
            Feed
          </Text>
        </TouchableOpacity>
      </View>

      {homeTab === "feed" ? (
        <Feed />
      ) : (
        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            !hasPrograms &&
              !hasLoggedStandaloneWorkout &&
              styles.scrollContentGrow,
          ]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={60}
        >
          <ActiveWorkoutBanner />

          <WeeklySchedule
            weekDates={weekDates}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNextWeek={goToNextWeek}
            onPreviousWeek={goToPreviousWeek}
            scheduleMap={scheduleMap}
            canGoToPreviousWeek={canGoToPreviousWeek}
            canGoToNextWeek={canGoToNextWeek}
            isCurrentProgramWeek={isCurrentProgramWeek}
          />

          {!hasPrograms && !hasLoggedStandaloneWorkout && (
            <View style={styles.noProgramsContainer}>
              <NoPrograms />
            </View>
          )}

          {isSwitchingDay ? (
            <ActivityIndicator style={{ marginVertical: spacing.md }} />
          ) : dayDetail ? (
            <WorkoutDetail
              dayDetail={dayDetail}
              isLoading={false}
              programId={selectedProgramId}
              onExerciseSaved={setToastMessage}
            />
          ) : hasLoggedStandaloneWorkout ? (
            <WorkoutLogSummary
              workoutLogs={workoutLogs ?? []}
              onEdit={() => setIsWorkoutLoggerModalOpen(true)}
            />
          ) : (
            <View>
              {hasPrograms && (
                <View style={styles.noWorkoutContainer}>
                  <Text style={styles.noWorkoutTitle}>
                    No workout scheduled for today
                  </Text>
                  <Text style={styles.noWorkoutText}>
                    You can still log a workout if you decide to train by
                    clicking the button below.
                  </Text>
                </View>
              )}
              <Button
                title="Log Workout"
                onPress={handleLogWorkout}
                variant="outline"
                style={styles.logWorkoutButton}
              />
            </View>
          )}
        </KeyboardAwareScrollView>
      )}

      <Modal
        visible={isWorkoutLoggerModalOpen}
        onClose={() => handleCloseWorkoutLogger(false)}
        closable={!isSavingWorkout}
        size="large"
        headerAction={
          isWorkoutFormDirty ? (
            <Button
              title={isSavingWorkout ? "SAVING..." : "SAVE"}
              onPress={() => workoutLoggerRef.current?.save()}
              disabled={isSavingWorkout}
              style={styles.modalSaveButton}
              textStyle={styles.modalSaveButtonText}
            />
          ) : undefined
        }
      >
        <WorkoutLogger
          ref={workoutLoggerRef}
          setClose={handleCloseWorkoutLogger}
          date={selectedDateKey}
          initialWorkoutLogs={workoutLogs ?? []}
          onSaved={setToastMessage}
          prefillExercises={prefillExercises}
          onDirtyChange={setIsWorkoutFormDirty}
          onSavingChange={setIsSavingWorkout}
        />
      </Modal>

      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ""}
        onHide={() => setToastMessage(null)}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  scrollContentGrow: {
    flexGrow: 1,
  },
  homeTabBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 10,
    padding: 3,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  homeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  homeTabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  homeTabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  homeTabTextActive: {
    color: "#000",
  },
  noProgramsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noWorkoutContainer: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
    alignItems: "center",
  },
  noWorkoutTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    textAlign: "center",
  },
  noWorkoutText: {
    color: colors.textSecondary,
    textAlign: "center",
  },
  logWorkoutButton: {
    alignSelf: "center",
    marginTop: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  modalSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  modalSaveButtonText: {
    fontSize: fontSizes.sm,
  },
});
