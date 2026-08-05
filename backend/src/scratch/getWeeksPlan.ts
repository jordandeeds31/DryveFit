const REAL_DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface PlannedDay {
  date: Date;
  dayName: string;
  isTrainingDay: boolean;
}

interface WeekPlan {
  weekNumber: number;
  days: PlannedDay[];
  trainingDays: string[];
}

const normalizeDay = (day: string) => {
  const map: Record<string, string> = {
    sun: "SUN",
    mon: "MON",
    tue: "TUE",
    wed: "WED",
    thu: "THU",
    fri: "FRI",
  };
  return map[day.trim().toLowerCase()] ?? day.toUpperCase();
};

// "This function takes the total number of days in the program and divides it into full 7-day weeks plus any leftover days, so if a program doesn't divide evenly into weeks — like 65 days — it correctly accounts for that partial final week instead of dropping days or rounding incorrectly.
const getWeekBreakdown = (durationDays: number) => {
  const fullWeeks = Math.floor(durationDays / 7);
  const leftoverDays = durationDays % 7;
  const totalWeeks = leftoverDays > 0 ? fullWeeks + 1 : fullWeeks;
  return { fullWeeks, leftoverDays, totalWeeks };
};

export const getWeeksPlan = (
  startDate: Date, // the first calendar day of the program
  durationDays: number, // total length of the program in days
  preferredDays: string[], // e.g. ["mon", "wed", "fri"] — the user's chosen training days
): WeekPlan[] => {
  // Convert preferred days into normalized, uppercase short-form names (e.g. "MON"),
  // stored in a Set so lookups are O(1) later
  const normalizedPreferred = new Set(preferredDays.map(normalizeDay));

  // Figure out how many weeks the plan needs, including a partial final week
  // if durationDays doesn't divide evenly by 7
  const { totalWeeks } = getWeekBreakdown(durationDays);

  const plan: WeekPlan[] = []; // the final array of WeekPlan objects we'll return
  let dayOffset = 0; // running count of how many days we've scheduled so far

  // Loop once per week in the program (1-indexed for display purposes)
  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
    const days: PlannedDay[] = []; // holds each day's info for this week

    // How many days are left in the whole program from this point on
    const daysRemaining = durationDays - dayOffset;

    // This week gets 7 days, unless fewer days remain (i.e. the final partial week)
    const daysInThisWeek = Math.min(7, daysRemaining);

    // Loop once per day within this week
    for (let i = 0; i < daysInThisWeek; i++) {
      // Clone startDate so we don't mutate the original reference
      const date = new Date(startDate);

      // Advance the clone forward by dayOffset days to get this specific day's date
      date.setDate(date.getDate() + dayOffset);

      // Look up the 3-letter day name (SUN, MON, etc.) based on the date's weekday index
      const dayName = REAL_DAY_NAMES[date.getDay()];

      // Check whether this day of the week is one the user wants to train on
      const isTrainingDay = normalizedPreferred.has(dayName);

      // Add this day's info to the current week's day list
      days.push({ date, dayName, isTrainingDay });

      // Move the running day counter forward by one, so the next iteration
      // (whether still in this week or the start of the next) computes the correct date
      dayOffset++;
    }

    // Once all days for this week are built, add the week's summary to the plan
    plan.push({
      weekNumber,
      days,
      // Pull out just the day names that were marked as training days, for quick reference
      trainingDays: days.filter((d) => d.isTrainingDay).map((d) => d.dayName),
    });
  }

  // Return the complete list of WeekPlan objects, one per week
  return plan;
};
