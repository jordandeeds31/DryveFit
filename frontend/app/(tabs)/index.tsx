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
import Button from "@/components/shared/Button/Button";
import useToggle from "@/hooks/useToggle";
import { spacing } from "@/constants/spacing";
import NoPrograms from "@/components/shared/NoPrograms/NoPrograms";
import { usePrograms, useSchedule, useProgramDay } from "@/hooks/usePrograms";
import { useWorkoutLogsForDate } from "@/hooks/useWorkoutLogs";
import { getWeekDates, toDateKey } from "@/lib/utils/date.utils";
import WeeklySchedule from "@/features/WeeklySchedule/WeeklySchedule";
import { ScheduleEntry } from "@/types/programs.types";
import WorkoutDetail from "@/features/WorkoutDetail/WorkoutDetail";
import WorkoutLogger from "@/features/WorkoutLogger/WorkoutLogger";

const HomeScreen = () => {
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWorkoutLoggerOpen, setIsWorkoutLoggerOpen] = useState(false);

  const { isOpen, close, toggle } = useToggle();

  const { data: programs, isLoading: isProgramsLoading } = usePrograms();
  const { data: schedule } = useSchedule();

  const weekDates = getWeekDates(referenceDate);

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

  // Combined flag — true while EITHER query is refetching for the newly
  // selected date, so we show exactly one spinner instead of two, and
  // never briefly render the "no workout" empty state before data settles.
  const isSwitchingDay = isDayDetailLoading || isWorkoutLogsLoading;

  useEffect(() => {
    setIsWorkoutLoggerOpen(false);
  }, [selectedDateKey]);

  const goToNextWeek = () => {
    const nextDate = new Date(referenceDate);
    nextDate.setDate(referenceDate.getDate() + 7);
    setReferenceDate(nextDate);
  };

  const goToPreviousWeek = () => {
    const prevDate = new Date(referenceDate);
    prevDate.setDate(referenceDate.getDate() - 7);
    setReferenceDate(prevDate);
  };

  if (isProgramsLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.buttonContainer}>
          <Button title="CREATE NEW PROGRAM" onPress={toggle} />
        </View>

        {isOpen && <ProgramBuilder onCancel={close} onCreated={close} />}

        <WeeklySchedule
          weekDates={weekDates}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onNextWeek={goToNextWeek}
          onPreviousWeek={goToPreviousWeek}
          scheduleMap={scheduleMap}
        />

        {!hasPrograms && (
          <View style={styles.noProgramsContainer}>
            <NoPrograms />
          </View>
        )}

        {isSwitchingDay ? (
          <ActivityIndicator style={{ marginVertical: spacing.md }} />
        ) : isWorkoutLoggerOpen && !dayDetail ? (
          <WorkoutLogger
            setClose={setIsWorkoutLoggerOpen}
            date={selectedDateKey}
            initialWorkoutLogs={workoutLogs ?? []}
          />
        ) : dayDetail ? (
          <WorkoutDetail dayDetail={dayDetail} isLoading={false} />
        ) : (
          <View>
            {hasPrograms && (
              <Text style={{ marginBottom: spacing.sm }}>
                No workout scheduled for today. You can still log a workout if
                you decide to train by clicking the button below.
              </Text>
            )}
            <Button
              title="Log Workout"
              onPress={() => setIsWorkoutLoggerOpen(true)}
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
  noProgramsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
