import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { toDateKey } from "@/lib/utils/date.utils";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// null = a blank leading/trailing cell (before the 1st or after the last
// day) needed to align the grid to real weekday columns.
const buildMonthGrid = (year: number, month: number): (number | null)[][] => {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
};

interface MonthCalendarProps {
  // "YYYY-MM-DD" keys that actually have a logged entry — everything else
  // in the grid renders as a plain, untappable day number.
  loggedDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  // Fired with "YYYY-MM" whenever the visible month changes, so the
  // parent can refetch that month's data.
  onMonthChange: (monthKey: string) => void;
}

// A real month grid (every day of the month, aligned to weekday columns),
// not the app's existing 7-day week strip (WeeklySchedule) — this is a
// different, bigger view purpose-built for browsing a whole month of
// someone else's history. Fully generic over what "logged" means — used
// for both the Nutrition and Workouts tabs on the public profile screen.
// Logged days render as a filled blue circle (tappable, shows that day's
// detail); everything else is a plain number.
const MonthCalendar = ({
  loggedDates,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: MonthCalendarProps) => {
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const isCurrentMonth =
    anchor.getFullYear() === today.getFullYear() &&
    anchor.getMonth() === today.getMonth();

  const weeks = buildMonthGrid(anchor.getFullYear(), anchor.getMonth());

  const goToMonth = (delta: number) => {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    setAnchor(next);
    onMonthChange(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goToMonth(-1)}
          hitSlop={8}
          style={styles.navButton}
        >
          <Feather name="chevron-left" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_LABELS[anchor.getMonth()]} {anchor.getFullYear()}
        </Text>
        <TouchableOpacity
          onPress={() => goToMonth(1)}
          disabled={isCurrentMonth}
          hitSlop={8}
          style={styles.navButton}
        >
          <Feather
            name="chevron-right"
            size={18}
            color={isCurrentMonth ? colors.borderGray : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={index} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((dayNum, dayIndex) => {
            if (dayNum == null) {
              return <View key={dayIndex} style={styles.dayCell} />;
            }

            const dateKey = toDateKey(
              new Date(anchor.getFullYear(), anchor.getMonth(), dayNum),
            );
            const hasLog = loggedDates.has(dateKey);
            const isSelected = selectedDate === dateKey;

            return (
              <TouchableOpacity
                key={dayIndex}
                style={styles.dayCell}
                onPress={() => onSelectDate(dateKey)}
                disabled={!hasLog}
              >
                <View
                  style={[
                    styles.dayCircle,
                    hasLog && styles.dayCircleLogged,
                    isSelected && styles.dayCircleSelected,
                  ]}
                >
                  <Text
                    style={[styles.dayNumber, hasLog && styles.dayNumberLogged]}
                  >
                    {dayNum}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default MonthCalendar;

const CELL_SIZE = 34;

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  navButton: {
    padding: spacing.xs,
  },
  monthLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleLogged: {
    backgroundColor: colors.primaryBlue,
  },
  dayCircleSelected: {
    borderWidth: 2,
    borderColor: colors.textSecondary,
  },
  dayNumber: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  dayNumberLogged: {
    color: "white",
    fontWeight: fontWeights.bold,
  },
});
