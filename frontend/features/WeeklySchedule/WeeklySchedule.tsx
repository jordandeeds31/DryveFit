import { useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import styles from "./WeeklySchedule.styles";
import { WeeklyScheduleProps } from "./WeeklySchedule.types";
import { ScheduleEntry } from "@/types/programs.types";
import { colors } from "@/constants/colors";
import {
  DAY_LABELS,
  isSameDay,
  formatMonthYear,
  toDateKey,
  getWeekDates,
} from "@/lib/utils/date.utils";

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const WeeklySchedule = ({
  weekDates,
  selectedDate,
  setSelectedDate,
  onNextWeek,
  onPreviousWeek,
  scheduleMap,
  canGoToPreviousWeek,
  canGoToNextWeek,
  isCurrentProgramWeek,
}: WeeklyScheduleProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);

  // Keep the latest boundary flags/callbacks reachable from the scroll
  // handler without needing to recreate anything when they change.
  const latest = useRef({
    onNextWeek,
    onPreviousWeek,
    canGoToNextWeek,
    canGoToPreviousWeek,
  });
  latest.current = {
    onNextWeek,
    onPreviousWeek,
    canGoToNextWeek,
    canGoToPreviousWeek,
  };

  const previousWeekDates = getWeekDates(addDays(weekDates[0], -7));
  const nextWeekDates = getWeekDates(addDays(weekDates[0], 7));

  const recenter = (animated: boolean) => {
    scrollRef.current?.scrollTo({ x: pageWidth, y: 0, animated });
  };

  // Recentering must happen only AFTER the new weekDates prop (and thus the
  // three pages' recomputed content) has actually landed — recentering
  // synchronously inside the scroll handler, before that prop update
  // reaches this component, would snap the scroll position back to the
  // middle page while it still shows the OLD week for one frame, then jump
  // again once the new data arrives: a visible flash. useLayoutEffect fires
  // after render but before paint, so the reset happens on the same frame
  // the new data is committed — nothing stale is ever shown on screen.
  // This same effect also handles the very first mount (pageWidth becoming
  // known for the first time).
  useLayoutEffect(() => {
    if (pageWidth > 0) {
      recenter(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth, weekDates[0]?.getTime()]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width !== pageWidth) setPageWidth(width);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (pageWidth === 0) return;
    const page = Math.round(event.nativeEvent.contentOffset.x / pageWidth);

    if (page === 0) {
      if (latest.current.canGoToPreviousWeek) {
        // Recentering happens in the layout effect once weekDates actually
        // updates — not here, or the reset would race the state update
        // and flash the old week for a frame.
        latest.current.onPreviousWeek();
      } else {
        recenter(true);
      }
    } else if (page === 2) {
      if (latest.current.canGoToNextWeek) {
        latest.current.onNextWeek();
      } else {
        recenter(true);
      }
    }
  };

  const renderWeekRow = (dates: Date[]) => (
    <View style={[styles.datesRow, { width: pageWidth }]}>
      {dates.map((date, index) => {
        const isSelected = isSameDay(date, selectedDate);
        const isToday = isSameDay(date, new Date());
        const scheduleEntry: ScheduleEntry | undefined =
          scheduleMap[toDateKey(date)];
        const programDay = scheduleEntry?.programDays[0];
        const hasStandaloneLog = !!scheduleEntry?.hasStandaloneLog;

        const completionPercent =
          programDay && programDay.totalCount > 0
            ? Math.round(
                (programDay.completedCount / programDay.totalCount) * 100,
              )
            : programDay
              ? 0
              : null;

        return (
          <TouchableOpacity
            style={[styles.dateButton, isSelected && styles.dateButtonSelected]}
            key={index}
            onPress={() => setSelectedDate(date)}
          >
            <View style={styles.todayDotContainer}>
              {isToday && <View style={styles.todayDot} />}
            </View>
            <Text style={[styles.dayLabel]}>{DAY_LABELS[index]}</Text>
            <Text style={[styles.date, isSelected && styles.dateSelected]}>
              {date.getDate()}
            </Text>
            <View style={styles.indicatorContainer}>
              {completionPercent !== null ? (
                <Text
                  style={[
                    styles.completionPercent,
                    completionPercent === 100 &&
                      styles.completionPercentComplete,
                  ]}
                >
                  {completionPercent}%
                </Text>
              ) : hasStandaloneLog ? (
                <View style={styles.standaloneLogDot} />
              ) : (
                <Text style={styles.noWorkoutDash}>–</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.datesContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onPreviousWeek}
          disabled={!canGoToPreviousWeek}
        >
          <Feather
            name="chevron-left"
            size={24}
            color={canGoToPreviousWeek ? undefined : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.monthLabel}>{formatMonthYear(weekDates)}</Text>
          {isCurrentProgramWeek && (
            <View style={styles.currentProgramBadge}>
              <Text style={styles.currentProgramBadgeText}>
                CURRENT PROGRAM
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={onNextWeek} disabled={!canGoToNextWeek}>
          <Feather
            name="chevron-right"
            size={24}
            color={canGoToNextWeek ? undefined : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View onLayout={handleLayout}>
        {pageWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            contentOffset={{ x: pageWidth, y: 0 }}
          >
            {renderWeekRow(previousWeekDates)}
            {renderWeekRow(weekDates)}
            {renderWeekRow(nextWeekDates)}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default WeeklySchedule;
