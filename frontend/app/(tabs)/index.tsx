import { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import {
  clearPendingWorkout,
  PendingWorkoutExercise,
} from "@/store/slices/pendingWorkoutSlice";
import AppHeader from "@/components/shared/AppHeader/AppHeader";
import ProgramBuilder from "@/features/ProgramBuilder/ProgramBuilder";
import Modal from "@/components/shared/Modal/Modal";
import Button from "@/components/shared/Button/Button";
import useToggle from "@/hooks/useToggle";
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
import { ensureProAccess } from "@/lib/purchases/requirePro";
import ActiveWorkoutBanner from "@/components/shared/ActiveWorkoutBanner/ActiveWorkoutBanner";
import Toast from "@/components/shared/Toast/Toast";
import Feed from "@/features/Feed/Feed";

const HomeScreen = () => {
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWorkoutLoggerOpen, setIsWorkoutLoggerOpen] = useState(false);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<"workouts" | "feed">("workouts");
  const [prefillExercises, setPrefillExercises] = useState<
    PendingWorkoutExercise[] | undefined
  >(undefined);

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
      setIsWorkoutLoggerOpen(true);
      dispatch(clearPendingWorkout());
    }
  }, [pendingWorkoutExercises, dispatch]);

  const handleCloseWorkoutLogger = (value: boolean) => {
    setIsWorkoutLoggerOpen(value);
    if (!value) setPrefillExercises(undefined);
  };

  const { isOpen, close, toggle } = useToggle();

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

  const canGoToPreviousWeek =
    hasPrograms &&
    (!earliestWeekStart ||
      startOfDay(weekDates[0]).getTime() > earliestWeekStart.getTime());

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
    setIsWorkoutLoggerOpen(false);
    setPrefillExercises(undefined);
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

  const handleCreateProgram = async () => {
    const granted = await ensureProAccess();
    if (granted) toggle();
  };

  // The "+" that opens ProgramBuilder now lives in the shared AppHeader
  // (freeing up the space the old full-width button took, for the
  // Workouts/Feed tab bar below it) — only this screen overrides the
  // header to include it, via navigation.setOptions rather than a prop
  // threaded through (tabs)/_layout.tsx, since only Home needs it.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => <AppHeader onCreateProgram={handleCreateProgram} />,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const handleLogWorkout = async () => {
    const granted = await ensureProAccess();
    if (granted) setIsWorkoutLoggerOpen(true);
  };

  if (isProgramsLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          !hasPrograms &&
            !isWorkoutLoggerOpen &&
            !hasLoggedStandaloneWorkout &&
            styles.scrollContentGrow,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <ActiveWorkoutBanner />

        <Modal visible={isOpen} onClose={close} closable={!isGeneratingProgram}>
          <ProgramBuilder
            onCreated={close}
            onGeneratingChange={setIsGeneratingProgram}
          />
        </Modal>

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

        {!hasPrograms && !isWorkoutLoggerOpen && !hasLoggedStandaloneWorkout && (
          <View style={styles.noProgramsContainer}>
            <NoPrograms />
          </View>
        )}

        {isSwitchingDay ? (
          <ActivityIndicator style={{ marginVertical: spacing.md }} />
        ) : (isWorkoutLoggerOpen || hasLoggedStandaloneWorkout) && !dayDetail ? (
          <WorkoutLogger
            setClose={handleCloseWorkoutLogger}
            date={selectedDateKey}
            initialWorkoutLogs={workoutLogs ?? []}
            onSaved={setToastMessage}
            prefillExercises={prefillExercises}
          />
        ) : dayDetail ? (
          <WorkoutDetail
            dayDetail={dayDetail}
            isLoading={false}
            programId={selectedProgramId}
            onExerciseSaved={setToastMessage}
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
      </ScrollView>
      )}
      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ""}
        onHide={() => setToastMessage(null)}
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
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
});
