export interface NutritionCalendarProps {
  weekDates: Date[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
  canGoToPreviousWeek: boolean;
  canGoToNextWeek: boolean;
  // Dates (YYYY-MM-DD) that have at least one logged food entry — drives
  // the small dot indicator per day, same spot WeeklySchedule uses for
  // completion percentage/standalone-log dot.
  loggedDateKeys: Set<string>;
}
