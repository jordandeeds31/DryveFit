import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const HomeScreen = () => {
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWorkoutLoggerOpen, setIsWorkoutLoggerOpen] = useState(false);
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false);

  const { isOpen, close, toggle } = useToggle();

  const { data: programs, isLoading: isProgramsLoading } = usePrograms();
  const { data: schedule } = useSchedule();

  const weekDates = getWeekDates(referenceDate);

  const activeProgram = programs?.find((program) => program.isActive) ?? null;

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
    !earliestWeekStart ||
    startOfDay(weekDates[0]).getTime() > earliestWeekStart.getTime();

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
    !latestWeekStart ||
    startOfDay(weekDates[0]).getTime() < latestWeekStart.getTime();

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

  const hasPrograms = !!programs && programs.length > 0;
  const hasLoggedStandaloneWorkout = (workoutLogs ?? []).length > 0;

  // Combined flag — true while EITHER query is refetching for the newly
  // selected date, so we show exactly one spinner instead of two, and
  // never briefly render the "no workout" empty state before data settles.
  const isSwitchingDay = isDayDetailLoading || isWorkoutLogsLoading;

  useEffect(() => {
    setIsWorkoutLoggerOpen(false);
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

  const handleLogWorkout = async () => {
    const granted = await ensureProAccess();
    if (granted) setIsWorkoutLoggerOpen(true);
  };

  if (isProgramsLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ActiveWorkoutBanner />

        <View style={styles.buttonContainer}>
          <Button
            title="CREATE NEW PROGRAM"
            onPress={handleCreateProgram}
            style={styles.createProgramButton}
          />
        </View>

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
            setClose={setIsWorkoutLoggerOpen}
            date={selectedDateKey}
            initialWorkoutLogs={workoutLogs ?? []}
          />
        ) : dayDetail ? (
          <WorkoutDetail
            dayDetail={dayDetail}
            isLoading={false}
            programId={selectedProgramId}
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
    flexGrow: 1,
  },
  buttonContainer: {
    marginBottom: spacing.md,
  },
  createProgramButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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
