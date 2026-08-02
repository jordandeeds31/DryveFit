import { View, Text, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import styles from "./WeeklySchedule.styles";
import { WeeklyScheduleProps } from "./WeeklySchedule.types";
import {
  DAY_LABELS,
  isSameDay,
  formatWeekRange,
  toDateKey,
} from "@/lib/utils/date.utils";

const WeeklySchedule = ({
  weekDates,
  selectedDate,
  setSelectedDate,
  onNextWeek,
  onPreviousWeek,
  scheduleMap,
}: WeeklyScheduleProps) => {
  return (
    <View style={styles.datesContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPreviousWeek}>
          <Feather name="chevron-left" size={24} />
        </TouchableOpacity>

        <Text style={styles.weekRange}>{formatWeekRange(weekDates)}</Text>

        <TouchableOpacity onPress={onNextWeek}>
          <Feather name="chevron-right" size={24} />
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
