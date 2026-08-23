import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
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
import { useCurrentUser } from "@/hooks/useUsers";
import { useNewPostsCount, useMarkFeedViewed } from "@/hooks/usePosts";
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
import News from "@/features/News/News";
import BodyScan from "@/features/BodyScan/BodyScan";
import {
  isHealthKitAvailable,
  hasCompletedHealthKitConnect,
  hasDismissedDeviceSetupPrompt,
  dismissDeviceSetupPrompt,
} from "@/lib/health/healthkit";

const HomeScreen = () => {
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWorkoutLoggerModalOpen, setIsWorkoutLoggerModalOpen] =
    useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [homeTab, setHomeTab] = useState<
    "workouts" | "feed" | "news" | "bodyScan"
  >("workouts");
  const [prefillExercises, setPrefillExercises] = useState<
    PendingWorkoutExercise[] | undefined
  >(undefined);
  const [isWorkoutFormDirty, setIsWorkoutFormDirty] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const workoutLoggerRef = useRef<WorkoutLoggerHandle>(null);
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [showDeviceSetupBanner, setShowDeviceSetupBanner] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const pendingWorkoutExercises = useSelector(
    (state: RootState) => state.pendingWorkout.exercises,
  );
  const { data: currentUser } = useCurrentUser();
  const { data: newPostsCount } = useNewPostsCount();
  const { mutate: markFeedViewed } = useMarkFeedViewed();

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

  // Re-checks on every focus, not just mount, so coming back from Profile
  // after connecting (or dismissing from elsewhere) makes the banner
  // disappear immediately, same pattern as Cardio's watch banner.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "ios" || !currentUser) {
        setShowDeviceSetupBanner(false);
        return;
      }
      let cancelled = false;
      (async () => {
        const available = await isHealthKitAvailable();
        if (!available) {
          if (!cancelled) setShowDeviceSetupBanner(false);
          return;
        }
        const [connected, dismissed] = await Promise.all([
          hasCompletedHealthKitConnect(currentUser.id),
          hasDismissedDeviceSetupPrompt(currentUser.id),
        ]);
        if (!cancelled) setShowDeviceSetupBanner(!connected && !dismissed);
      })();
      return () => {
        cancelled = true;
      };
    }, [currentUser]),
  );

  const handleDismissDeviceSetupBanner = () => {
    setShowDeviceSetupBanner(false);
    if (currentUser) dismissDeviceSetupPrompt(currentUser.id);
  };

  const handleCloseWorkoutLogger = (value: boolean) => {
    setIsWorkoutLoggerModalOpen(value);
    if (!value) {
      setPrefillExercises(undefined);
      setIsWorkoutFormDirty(false);
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

  // Mirror of the above: the user should always be able to page forward at
  // least as far as today's week, regardless of whether they have any
  // programs (or if every program they have has already ended) — the old
  // `hasPrograms &&` gate meant that after paging back, someone with no
  // active program (or an expired one) could never page back forward to
  // today, since the "next week" arrow stayed permanently disabled. A
  // program that extends past today can still push the boundary forward
  // further, so take whichever of the two is latest, same as the backward
  // boundary takes whichever is earliest.
  const latestProgramEndDate =
    programs && programs.length > 0
      ? new Date(
          Math.max(...programs.map((p) => new Date(p.endDate).getTime())),
        )
      : null;

  const latestProgramWeekStart = latestProgramEndDate
    ? startOfDay(getWeekDates(latestProgramEndDate)[0])
    : null;

  const latestAllowedWeekStart =
    latestProgramWeekStart && latestProgramWeekStart.getTime() > todayWeekStart.getTime()
      ? latestProgramWeekStart
      : todayWeekStart;

  const canGoToNextWeek =
    startOfDay(weekDates[0]).getTime() < latestAllowedWeekStart.getTime();

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
            numberOfLines={1}
          >
            Workouts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.homeTab,
            homeTab === "bodyScan" && styles.homeTabActive,
          ]}
          onPress={() => setHomeTab("bodyScan")}
        >
          <Text
            style={[
              styles.homeTabText,
              homeTab === "bodyScan" && styles.homeTabTextActive,
            ]}
            numberOfLines={1}
          >
            Body Scan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.homeTab, homeTab === "feed" && styles.homeTabActive]}
          onPress={() => {
            setHomeTab("feed");
            if (newPostsCount) markFeedViewed();
          }}
        >
          <Text
            style={[
              styles.homeTabText,
              homeTab === "feed" && styles.homeTabTextActive,
            ]}
            numberOfLines={1}
          >
            Feed
          </Text>
          {/* Only while sitting on Workouts — clicking through to Feed
              marks it viewed immediately (see onPress above), so showing
              the badge here too would just be a one-frame flash. */}
          {homeTab !== "feed" && !!newPostsCount && newPostsCount > 0 && (
            <View style={styles.newPostsBadge}>
              <Text style={styles.newPostsBadgeText}>
                {newPostsCount > 9 ? "9+" : newPostsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.homeTab, homeTab === "news" && styles.homeTabActive]}
          onPress={() => setHomeTab("news")}
        >
          <Text
            style={[
              styles.homeTabText,
              homeTab === "news" && styles.homeTabTextActive,
            ]}
            numberOfLines={1}
          >
            News
          </Text>
        </TouchableOpacity>
      </View>

      {showDeviceSetupBanner && (
        <TouchableOpacity
          style={styles.deviceSetupBanner}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/Profile",
              params: { openDevices: "1" },
            })
          }
        >
          <Ionicons name="watch-outline" size={16} color={colors.primaryBlue} />
          <Text style={styles.deviceSetupBannerText}>
            Connect Apple Health to track heart rate, calories, and activity.
          </Text>
          <TouchableOpacity
            hitSlop={8}
            onPress={handleDismissDeviceSetupBanner}
          >
            <Ionicons name="close" size={16} color={colors.primaryBlue} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {homeTab === "feed" ? (
        <Feed />
      ) : homeTab === "news" ? (
        <News />
      ) : homeTab === "bodyScan" ? (
        <BodyScan />
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
          // None of Home's directly-owned children have a TextInput — every
          // input in the Workouts tab (WorkoutDetail's modals, WorkoutLogger)
          // lives inside its own separate RNModal window. But keyboard
          // events are global, so with this enabled, Home's ScrollView still
          // reacted to those unrelated modals' keyboards, adding/removing
          // bottom padding it never needed and drifting out of sync —
          // visible as a stale gap once a modal closed. Disabling it removes
          // the reactive behavior at the source instead of correcting for it.
          enabled={false}
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

          {isProgramsLoading ? (
            <ActivityIndicator style={{ marginVertical: spacing.md }} />
          ) : (
            !hasPrograms &&
            !hasLoggedStandaloneWorkout && (
              <View style={styles.noProgramsContainer}>
                <NoPrograms />
              </View>
            )
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
              <TouchableOpacity
                style={styles.logWorkoutButton}
                onPress={handleLogWorkout}
              >
                <Text style={styles.logWorkoutButtonText}>Log Workout</Text>
              </TouchableOpacity>
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
    position: "relative",
  },
  newPostsBadge: {
    position: "absolute",
    top: 2,
    right: "18%",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.dangerRed,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "white",
  },
  newPostsBadgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: "white",
  },
  deviceSetupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceBlueLight,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    borderRadius: 8,
    padding: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  deviceSetupBannerText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.primaryBlue,
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
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  logWorkoutButtonText: {
    color: colors.primaryBlue,
    fontWeight: fontWeights.semibold,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  modalSaveButtonText: {
    fontSize: fontSizes.sm,
  },
});
