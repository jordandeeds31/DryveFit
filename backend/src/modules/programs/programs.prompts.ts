export const PROGRAM_DURATION_DAYS = [30, 60, 90] as const;
export type ProgramDurationDays = (typeof PROGRAM_DURATION_DAYS)[number];

const REAL_DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const DAY_ALIASES: Record<string, string> = {
  sun: "SUN",
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thr: "THU",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
};

export const BODY_PARTS = [
  "chest",
  "back",
  "lats",
  "traps",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "lower back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "hip flexors",
  "adductors",
  "abductors",
  "full body",
  "cardio",
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export const normalizeDay = (day: string): string => {
  const key = day.trim().toLowerCase();
  return DAY_ALIASES[key] ?? day.toUpperCase();
};

export const getWeekBreakdown = (durationDays: number) => {
  const fullWeeks = Math.floor(durationDays / 7);
  const leftoverDays = durationDays % 7;
  const totalWeeks = leftoverDays > 0 ? fullWeeks + 1 : fullWeeks;
  return { fullWeeks, leftoverDays, totalWeeks };
};

export interface PlannedDay {
  date: Date;
  dayName: string;
  isTrainingDay: boolean;
}

export interface WeekPlan {
  weekNumber: number;
  days: PlannedDay[];
  trainingDays: string[];
}

export const getWeeksPlan = (
  startDate: Date,
  durationDays: number,
  preferredDays: string[],
): WeekPlan[] => {
  const normalizedPreferred = new Set(preferredDays.map(normalizeDay));
  const { totalWeeks } = getWeekBreakdown(durationDays);

  const plan: WeekPlan[] = [];
  let dayOffset = 0;

  for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
    const days: PlannedDay[] = [];
    const daysRemaining = durationDays - dayOffset;
    const daysInThisWeek = Math.min(7, daysRemaining);

    for (let i = 0; i < daysInThisWeek; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayOffset);
      const dayName = REAL_DAY_NAMES[date.getDay()];
      const isTrainingDay = normalizedPreferred.has(dayName);

      days.push({ date, dayName, isTrainingDay });
      dayOffset++;
    }

    plan.push({
      weekNumber,
      days,
      trainingDays: days.filter((d) => d.isTrainingDay).map((d) => d.dayName),
    });
  }

  return plan;
};

interface WeekPromptInput {
  weekNumber: number;
  totalWeeks: number;
  days: PlannedDay[];
  focusAreas: string[];
  sessionMinutes: number;
}

export const buildWeekPrompt = (input: WeekPromptInput): string => {
  const focusLabel =
    input.focusAreas.length > 0 ? input.focusAreas.join(", ") : "full body";
  const dayNames = input.days.map((d) => d.dayName);
  const trainingDayNames = input.days
    .filter((d) => d.isTrainingDay)
    .map((d) => d.dayName);

  return `You are an elite strength and conditioning coach. Generate week ${input.weekNumber} of ${input.totalWeeks} of a periodized workout program.

WEEK CONTEXT:
- This is week ${input.weekNumber} of ${input.totalWeeks} total weeks — apply progressive overload appropriate for this point in the program (early weeks: foundational volume and technique; later weeks: increased intensity and/or volume).
- Focus Areas: ${focusLabel}
- Session Length: ${input.sessionMinutes} minutes
- Days to include in this week's output: ${dayNames.join(", ")}
- Training days (assign real exercises): ${trainingDayNames.length > 0 ? trainingDayNames.join(", ") : "none — this is an all-rest week"}
- All other listed days are rest days (isRestDay: true, empty exercises array)

Respond ONLY with valid JSON — no markdown, no explanation, no code blocks. Structure:
{
  "days": [
    {
      "dayName": "MON",
      "focus": "Chest & Triceps",
      "isRestDay": false,
      "exercises": [
        {
          "exerciseName": "Barbell Bench Press",
          "muscleGroup": "chest",
          "sets": 4,
          "reps": 8,
          "restSeconds": 120,
          "notes": "Keep shoulder blades retracted. Control the eccentric for 3 seconds.",
          "order": 1
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- "reps" must be a single whole number (e.g. 8, 10, 12) — NEVER a range like "6-8" or "8-10", and never a string. Pick the single most appropriate rep count for that exercise, set, and week.
- "focus" must always be a non-empty string, even for rest days. Use "Rest" or "Active Recovery" as the focus value for any day where isRestDay is true — never an empty string.
- For timed exercises (planks, holds), use "reps" as the number of seconds instead, still as a single whole number.

Include exactly one entry in "days" for each of: ${dayNames.join(", ")} — in that order. Be thorough and specific with exercise selection, sets, reps, and coaching notes.`;
};

interface ProgramNameInput {
  durationDays: number;
  preferredDays: string[];
  focusAreas: string[];
  sessionMinutes: number;
}

export const buildProgramNamePrompt = (input: ProgramNameInput): string => {
  const focusLabel =
    input.focusAreas.length > 0 ? input.focusAreas.join(", ") : "full body";

  return `Generate a short, professional name for a workout program with these attributes:
- Duration: ${input.durationDays} days
- Training days per week: ${input.preferredDays.length}
- Focus areas: ${focusLabel}
- Session length: ${input.sessionMinutes} minutes

Requirements:
- 2-5 words, title case
- Sounds professional, like something a real training program would be called (e.g. "12-Week Strength Foundation", "Upper Body Power Builder", "Full Body Conditioning Program")
- No quotes, no punctuation at the end, no generic filler like "My Program"
- Respond with ONLY the name — no explanation, no markdown, nothing else`;
};

export const GENERATION_MESSAGES = [
  "Analyzing your training profile...",
  "Designing your personalized program structure...",
  "Building your weekly training splits...",
  "Programming exercise selection and volume...",
  "Calculating progressive overload...",
  "Optimizing rest and recovery days...",
  "Finalizing your program...",
];
