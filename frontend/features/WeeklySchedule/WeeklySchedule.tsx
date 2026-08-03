import { View, Text, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import styles from "./WeeklySchedule.styles";
import { WeeklyScheduleProps } from "./WeeklySchedule.types";
import { colors } from "@/constants/colors";
import {
  DAY_LABELS,
  isSameDay,
  formatMonthYear,
  toDateKey,
} from "@/lib/utils/date.utils";

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

      <View style={styles.datesRow}>
        {weekDates.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const scheduleEntry = scheduleMap[toDateKey(date)];
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
              style={[
                styles.dateButton,
                isSelected && styles.dateButtonSelected,
              ]}
              key={index}
              onPress={() => setSelectedDate(date)}
            >
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
    </View>
  );
};

export default WeeklySchedule;
