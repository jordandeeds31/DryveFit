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
import styles from "./NutritionCalendar.styles";
import { NutritionCalendarProps } from "./NutritionCalendar.types";
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

// Forked from features/WeeklySchedule/WeeklySchedule.tsx rather than made
// generic — that component's per-day cell is tightly coupled to program
// schedule data (completion %, "CURRENT PROGRAM" badge), which doesn't
// apply here. The pager/date-math (this file's real complexity) is kept
// identical; only the per-cell indicator content differs.
const NutritionCalendar = ({
  weekDates,
  selectedDate,
  setSelectedDate,
  onNextWeek,
  onPreviousWeek,
  canGoToPreviousWeek,
  canGoToNextWeek,
  loggedDateKeys,
}: NutritionCalendarProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);

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

  // See WeeklySchedule.tsx for why this must be useLayoutEffect rather
  // than a synchronous reset inside the scroll handler — same flash-of-
  // stale-week issue applies here.
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
        const hasLoggedEntry = loggedDateKeys.has(toDateKey(date));

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
              {hasLoggedEntry ? (
                <View style={styles.loggedDot} />
              ) : (
                <Text style={styles.noEntryDash}>–</Text>
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

export default NutritionCalendar;
