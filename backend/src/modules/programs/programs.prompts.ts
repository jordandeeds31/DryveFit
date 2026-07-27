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

export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

const FITNESS_LEVEL_GUIDANCE: Record<FitnessLevel, string> = {
  beginner:
    "This person is a beginner. Prioritize fundamental compound movements, machines and dumbbells over complex barbell lifts where appropriate, moderate volume (2-3 sets per exercise), longer rest periods (90-120s), and clear form cues in every note. Avoid advanced techniques like drop sets, supersets, or failure training.",
  intermediate:
    "This person is intermediate — comfortable with standard free-weight compound lifts. Use a mix of compound and isolation exercises, moderate-to-higher volume (3-4 sets), and standard rest periods (60-90s). Some intensity techniques (supersets, occasional drop sets) are fine.",
  advanced:
    "This person is advanced and trains hard. Include heavier compound lifts, higher volume and/or intensity (4-5 sets, lower rep ranges on strength days), advanced techniques where appropriate (drop sets, supersets, rest-pause, tempo work), and push closer to failure on isolation work. Assume strong technique and higher work capacity.",
};

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

export type DayFocusAssignment = Record<string, string[]>;

export const assignFocusAreasToDays = (
  trainingDayNames: string[],
  focusAreas: string[],
): DayFocusAssignment => {
  const numDays = trainingDayNames.length;
  const assignment: DayFocusAssignment = {};

  if (numDays === 0 || focusAreas.length === 0) return assignment;

  trainingDayNames.forEach((day) => {
    assignment[day] = [];
  });

  if (focusAreas.length <= numDays) {
    trainingDayNames.forEach((day, i) => {
      assignment[day] = [focusAreas[i % focusAreas.length]];
    });
    return assignment;
  }

  const baseSize = Math.floor(focusAreas.length / numDays);
  const remainder = focusAreas.length % numDays;
  let cursor = 0;

  trainingDayNames.forEach((day, i) => {
    const chunkSize = baseSize + (i < remainder ? 1 : 0);
    assignment[day] = focusAreas.slice(cursor, cursor + chunkSize);
    cursor += chunkSize;
  });

  return assignment;
};

interface WeekPromptInput {
  weekNumber: number;
  totalWeeks: number;
  days: PlannedDay[];
  focusAreaAssignment: DayFocusAssignment;
  sessionMinutes: number;
  fitnessLevel: FitnessLevel;
  allowedExercises: string[];
}

export const buildWeekPrompt = (input: WeekPromptInput): string => {
  const dayNames = input.days.map((d) => d.dayName);

  const dayPlanLines = input.days
    .map((d) => {
      if (!d.isTrainingDay) {
        return `- ${d.dayName}: Rest day`;
      }
      const focus = input.focusAreaAssignment[d.dayName] ?? [];
      return `- ${d.dayName}: Train ${focus.join(" & ")} ONLY — do not include exercises for any other body part on this day`;
    })
    .join("\n");

  const allowedExercisesText = input.allowedExercises.join(", ");

  return `You are an elite strength and conditioning coach. Generate week ${input.weekNumber} of ${input.totalWeeks} of a periodized workout program.

WEEK CONTEXT:
- This is week ${input.weekNumber} of ${input.totalWeeks} total weeks — apply progressive overload appropriate for this point in the program (early weeks: foundational volume and technique; later weeks: increased intensity and/or volume).
- Session Length: ${input.sessionMinutes} minutes
- Fitness Level: ${input.fitnessLevel.toUpperCase()} — ${FITNESS_LEVEL_GUIDANCE[input.fitnessLevel]}

ALLOWED EXERCISES (you MUST only select exercises from this exact list — do not invent, rename, or modify any exercise name):
${allowedExercisesText}

DAY-BY-DAY PLAN (follow exactly — each day trains only its assigned body part(s)):
${dayPlanLines}

Respond ONLY with valid JSON — no markdown, no explanation, no code blocks. Structure:
{
  "days": [
    {
      "dayName": "MON",
      "focus": "Chest",
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
- "exerciseName" MUST be copied EXACTLY, character-for-character, from the ALLOWED EXERCISES list above. Do not combine, rename, merge, abbreviate, or paraphrase any exercise name — even if it seems like a reasonable variation. For example, if the list contains "Barbell Bent Over Row" and "One-Arm Dumbbell Row" as two separate items, do NOT invent a new name like "Dumbbell Bent Over Row" by blending them — pick one of the two exact names as listed, unmodified.
- Before finalizing your response, double-check every "exerciseName" value against the ALLOWED EXERCISES list — if any name does not appear verbatim in that list, replace it with the closest exact match from the list instead.
- "reps" must be a single whole number (e.g. 8, 10, 12) — NEVER a range like "6-8" or "8-10", and never a string.
- "focus" must always be a non-empty string. For training days, it should name the assigned body part(s) exactly (e.g. "Chest", "Back & Biceps"). For rest days, use "Rest" or "Active Recovery".
- Each training day's exercises must ONLY target that day's assigned body part(s) — do not mix in unrelated muscle groups.
- Exercise selection, volume, and intensity must match the stated fitness level.
- For timed exercises (planks, holds), use "reps" as the number of seconds instead, still as a single whole number.

Include exactly one entry in "days" for each of: ${dayNames.join(", ")} — in that order. Be thorough and specific with exercise selection, sets, reps, and coaching notes.`;
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
