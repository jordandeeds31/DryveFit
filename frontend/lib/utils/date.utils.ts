export const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export const getWeekDates = (referenceDate: Date): Date[] => {
  const dayOfWeek = referenceDate.getDay(); // 0 = Sunday, 6 = Saturday

  const sunday = new Date(referenceDate);
  sunday.setDate(referenceDate.getDate() - dayOfWeek);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    week.push(day);
  }

  return week;
};

export const isSameDay = (dateA: Date, dateB: Date) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Weeks that straddle a month boundary are labeled with the month that owns
// the middle of the week, so the header reflects the month most of the
// visible days actually belong to.
export const formatMonthYear = (weekDates: Date[]): string => {
  const anchor = weekDates[3] ?? weekDates[0];
  return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
};

export const startOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
