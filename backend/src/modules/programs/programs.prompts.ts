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

export const TRAINING_SPLITS = [
  "full body",
  "upper / lower",
  "push / pull / legs",
  "bro split",
] as const;
export type TrainingSplit = (typeof TRAINING_SPLITS)[number];

// Each split maps to an ordered list of day-groups — the body parts trained
// together in a single session. Groups use the same muscleGroup values as
// the seeded Exercise catalog (see prisma/exercises.ts) so every group has
// real exercises to draw from.
export const SPLIT_TEMPLATES: Record<TrainingSplit, string[][]> = {
  "full body": [["chest", "back", "quads", "shoulders"]],
  "upper / lower": [
    ["chest", "back", "shoulders", "biceps", "triceps"],
    ["quads", "hamstrings", "glutes", "calves"],
  ],
  "push / pull / legs": [
    ["chest", "shoulders", "triceps"],
    ["back", "biceps", "lats", "traps"],
    ["quads", "hamstrings", "glutes", "calves"],
  ],
  "bro split": [
    ["chest"],
    ["back", "lats", "traps"],
    ["shoulders"],
    ["quads", "hamstrings", "glutes", "calves"],
    ["biceps", "triceps", "forearms"],
  ],
};

// Every body part trained anywhere in the split — used to build the
// allowed-exercise filter for the whole program.
export const getSplitBodyParts = (split: TrainingSplit): string[] => [
  ...new Set(SPLIT_TEMPLATES[split].flat()),
];

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

export const EQUIPMENT_ACCESS = [
  "full gym",
  "home gym (dumbbells + barbell)",
  "dumbbells only",
  "bodyweight only",
] as const;
export type EquipmentAccess = (typeof EQUIPMENT_ACCESS)[number];

// Maps each access level to the set of allowed `Exercise.equipment` values.
// `null` means no filtering — every equipment type is allowed.
export const EQUIPMENT_ACCESS_FILTERS: Record<
  EquipmentAccess,
  string[] | null
> = {
  "full gym": null,
  "home gym (dumbbells + barbell)": ["barbell", "dumbbell", "bodyweight"],
  "dumbbells only": ["dumbbell", "bodyweight"],
  "bodyweight only": ["bodyweight"],
};

export const TRAINING_GOALS = [
  "strength",
  "hypertrophy",
  "fat loss",
  "endurance",
  "general fitness",
] as const;
export type TrainingGoal = (typeof TRAINING_GOALS)[number];

const TRAINING_GOAL_GUIDANCE: Record<TrainingGoal, string> = {
  strength:
    "The primary goal is strength. Prioritize heavy compound lifts, lower rep ranges (3-6 reps), higher relative loads, and longer rest periods (2-3 minutes) to allow full recovery between sets. Keep total exercises per session lower and focus on the big lifts for the day's muscle groups.",
  hypertrophy:
    "The primary goal is hypertrophy (muscle growth). Use moderate rep ranges (8-12 reps), higher overall volume (more sets and exercises per muscle group), and moderate rest periods (60-90s). Mix compound and isolation movements to maximize time under tension.",
  "fat loss":
    "The primary goal is fat loss. Favor higher rep ranges (12-15+ reps), shorter rest periods (30-45s), and circuit-style or superset pairings where reasonable to keep heart rate elevated. Include a mix of compound movements and higher-intensity isolation work.",
  endurance:
    "The primary goal is muscular endurance. Use high rep ranges (15-20+ reps), light-to-moderate loads, and minimal rest periods (20-30s) between sets. Favor exercises that can be performed for extended sets with good form.",
  "general fitness":
    "The primary goal is general fitness and overall health. Use a balanced mix of rep ranges (8-15 reps), moderate volume, and standard rest periods (60-90s) across compound and isolation movements for well-rounded conditioning.",
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

export type DaySplitAssignment = Record<string, string[]>;

// Cycles through the split's day-groups across the user's training days, in
// real weekday order (SUN..SAT) — not click-selection order — so a split
// like Push/Pull/Legs reads naturally across the week. Wraps around and
// repeats the cycle if there are more training days than groups (e.g. PPL
// with 6 training days: Push, Pull, Legs, Push, Pull, Legs). Since this is
// computed once from the deduped set of weekday names and reused for every
// week during generation, the same day always gets the same assignment.
export const assignSplitToDays = (
  trainingDayNames: string[],
  splitTemplate: string[][],
): DaySplitAssignment => {
  const assignment: DaySplitAssignment = {};

  if (trainingDayNames.length === 0 || splitTemplate.length === 0) {
    return assignment;
  }

  const orderedDayNames = [...trainingDayNames].sort(
    (a, b) => REAL_DAY_NAMES.indexOf(a) - REAL_DAY_NAMES.indexOf(b),
  );

  orderedDayNames.forEach((day, index) => {
    assignment[day] = splitTemplate[index % splitTemplate.length];
  });

  return assignment;
};

export interface ExercisePerformance {
  weight: number;
  reps: number;
  estimated1RM: number;
}

interface WeekPromptInput {
  weekNumber: number;
  totalWeeks: number;
  days: PlannedDay[];
  daySplitAssignment: DaySplitAssignment;
  sessionMinutes: number;
  fitnessLevel: FitnessLevel;
  trainingGoal: TrainingGoal;
  allowedExercises: string[];
  performanceHistory: Record<string, ExercisePerformance>;
}

export const buildWeekPrompt = (input: WeekPromptInput): string => {
  const dayNames = input.days.map((d) => d.dayName);

  const dayPlanLines = input.days
    .map((d) => {
      if (!d.isTrainingDay) {
        return `- ${d.dayName}: Rest day`;
      }
      const focus = input.daySplitAssignment[d.dayName] ?? [];
      return `- ${d.dayName}: Train ${focus.join(" & ")} ONLY — do not include exercises for any other body part on this day`;
    })
    .join("\n");

  const allowedExercisesText = input.allowedExercises.join(", ");

  const performanceEntries = Object.entries(input.performanceHistory);
  const performanceHistoryText =
    performanceEntries.length > 0
      ? performanceEntries
          .map(
            ([exerciseName, perf]) =>
              `- User's last logged performance for ${exerciseName}: ${perf.weight} lbs x ${perf.reps} reps, estimated 1RM: ${perf.estimated1RM} lbs`,
          )
          .join("\n")
      : "- No prior logged performance for any allowed exercise. Omit \"recommendedWeight\" for every exercise this week.";

  return `You are an elite strength and conditioning coach. Generate week ${input.weekNumber} of ${input.totalWeeks} of a periodized workout program.

WEEK CONTEXT:
- This is week ${input.weekNumber} of ${input.totalWeeks} total weeks — apply progressive overload appropriate for this point in the program (early weeks: foundational volume and technique; later weeks: increased intensity and/or volume).
- Session Length: ${input.sessionMinutes} minutes
- Fitness Level: ${input.fitnessLevel.toUpperCase()} — ${FITNESS_LEVEL_GUIDANCE[input.fitnessLevel]}
- Training Goal: ${input.trainingGoal.toUpperCase()} — ${TRAINING_GOAL_GUIDANCE[input.trainingGoal]}

ALLOWED EXERCISES (you MUST only select exercises from this exact list — do not invent, rename, or modify any exercise name):
${allowedExercisesText}

USER'S LOGGED PERFORMANCE HISTORY (use this to decide "recommendedWeight" — see IMPORTANT RULES below):
${performanceHistoryText}

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
          "order": 1,
          "recommendedWeight": 155
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
- "recommendedWeight" is OPTIONAL and only applies to weighted exercises. Include it ONLY when the USER'S LOGGED PERFORMANCE HISTORY section above contains a prior entry for that exact exercise name. When included, set it to a specific number of pounds equal to roughly 70-85% of that exercise's estimated 1RM from the history — use a value closer to 85% when this week's prescribed "reps" for that exercise are low (e.g. 3-6) and closer to 70% when "reps" are high (e.g. 12+), scaling proportionally in between. If there is no prior history for an exercise (or it isn't a weighted exercise, like bodyweight holds), OMIT the "recommendedWeight" key entirely for that exercise — never guess or estimate one without history.

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
