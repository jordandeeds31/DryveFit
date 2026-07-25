export interface WeeklyScheduleProps {
  weekDates: Date[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
}
