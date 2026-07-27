import { ScheduleEntry } from "@/types/programs.types";

export interface WeeklyScheduleProps {
  weekDates: Date[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
  scheduleMap: Record<string, ScheduleEntry>;
}
