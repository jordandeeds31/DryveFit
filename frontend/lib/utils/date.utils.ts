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

export const formatWeekRange = (weekDates: Date[]): string => {
  const start = weekDates[0];
  const end = weekDates[6];

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const startLabel = `${monthNames[start.getMonth()]} ${start.getDate()}`;
  const endLabel = `${monthNames[end.getMonth()]} ${end.getDate()}`;
  const year = end.getFullYear();

  return `${startLabel} - ${endLabel}, ${year}`;
};
