export const PROGRAM_DURATION_DAYS = [30, 60, 90] as const;
export type ProgramDurationDays = (typeof PROGRAM_DURATION_DAYS)[number];

export const REAL_DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

// Equipment types where a finer plate/adjustment increment is realistic
// (e.g. a cable stack's small add-on plate) — everything else defaults to
// standard 5 lb barbell/dumbbell/machine plate increments.
const FINE_INCREMENT_EQUIPMENT = new Set(["cable", "bodyweight"]);

export const getWeightIncrement = (
  equipment: string | null | undefined,
): number => (equipment && FINE_INCREMENT_EQUIPMENT.has(equipment) ? 2.5 : 5);

// Pure bodyweight exercises have no adjustable external load, so weight
// progression doesn't apply to them at all — progression instead follows
// the standard "double progression" model used broadly in resistance
// training programming (NSCA/ACSM): increase reps linearly until a
// practical per-set ceiling, then progress by adding a set instead, since
// reps alone would otherwise climb indefinitely into endurance/cardio
// territory rather than continuing to drive strength/hypertrophy adaptation.
export const BODYWEIGHT_REP_CEILING = 20;
export const BODYWEIGHT_MAX_SETS = 5;

// Rounds a raw calculated weight to the nearest realistic gym increment
// (nearest, not always up or down, so recommendations don't drift) — the
// final step every weight-recommendation calculation should apply before
// the number is stored as recommendedWeight or shown to the user.
export const roundToNearestIncrement = (
  weight: number,
  increment: number,
): number => Math.round(weight / increment) * increment;

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

// A single true/false "did they meet every set" check treats a session
// that fell one rep short on the last, most fatigued set identically to a
// session that collapsed across multiple sets — those call for opposite
// coaching responses. This five-tier classification distinguishes them:
//   full_success      — every prescribed set was logged, all at or above
//                        the prescribed weight and reps.
//   partial_success    — FEWER sets were logged than prescribed, but every
//                        set that WAS logged met or exceeded the prescribed
//                        weight and reps. Logging fewer sets is ambiguous
//                        on its own (time, fatigue, or just doing fewer
//                        heavier sets) — it is not, by itself, evidence of
//                        overreach the way an attempted-and-failed set is.
//                        Progresses, just more conservatively than a full
//                        success, since it's one set count short of full
//                        proof.
//   near_miss         — only the final set fell short, by a small margin —
//                        classic end-of-session fatigue, not overreach.
//   moderate_miss     — a single non-final set missed by a small margin
//                        (final set otherwise fine), or the final set
//                        missed by a larger margin without collapsing
//                        (still completed a meaningful number of reps).
//   significant_miss  — a set was attempted and skipped outright, weight
//                        itself was reduced, more than one set missed
//                        meaningfully, or a set collapsed to well under
//                        half its target — genuine evidence the load is
//                        too heavy.
export type SessionClassification =
  | "full_success"
  | "partial_success"
  | "near_miss"
  | "moderate_miss"
  | "significant_miss";

export interface ExercisePerformance {
  weight: number;
  reps: number;
  estimated1RM: number;
  // Whether every prescribed set in that session was completed at or above
  // the prescribed weight and reps — computed in code, not left for the AI
  // to infer from raw set data.
  didMeetTarget: boolean;
  // True when didMeetTarget is false but only barely — every set was
  // attempted at the full prescribed weight, and the rep shortfall was
  // small (at most 2 reps total, at most 2 on any single set). This is
  // normal day-to-day variance (usually just the last, most fatigued set),
  // not evidence the weight itself is too heavy, so it should hold the
  // same weight steady next time rather than triggering full regression
  // down to fallbackWeight.
  isNearMiss: boolean;
  // Four-tier classification of the most recent session, for weighted
  // exercises only (null for bodyweight, which uses didMeetTarget/
  // isNearMiss above instead). See SessionClassification for tier meanings.
  weightClassification: SessionClassification | null;
  // The highest weight at which this exercise's FULL prescription (every
  // set, every prescribed rep, at that weight) has ever been completed,
  // across all past sessions — not just the most recent one. Acts as a
  // hard floor: a recommendation should never drop below a weight already
  // proven fully achievable, except when a significant miss happens AT
  // that same floor weight (real evidence of newly reduced capacity).
  // Null for bodyweight or if no session has ever fully succeeded.
  provenWeightFloor: number | null;
  // Precomputed weight to fall back to when didMeetTarget is false — a
  // working weight scaled down from their demonstrated 1RM for the full
  // originally prescribed rep target, so it's realistically completable
  // across every set (not just their single best set repeated, and not
  // the failed weight repeated).
  fallbackWeight: number;
  // What was actually recommended on the ProgramExercise for that logged
  // session, if any — lets the prompt state an explicit "recommended X,
  // achieved Y" comparison rather than just raw performance numbers. Null
  // for standalone logs or exercises that had no recommendation at the time.
  recommendedWeightAtTime: number | null;
  // The Exercise catalog's equipment type — "bodyweight" routes progression
  // through reps/sets instead of weight (see BODYWEIGHT_REP_CEILING above).
  equipment: string | null;
  prescribedSets: number | null;
  prescribedReps: number | null;
  // How many sets they actually completed — may exceed prescribedSets if
  // they did extra. Progression should build on what actually happened,
  // not just repeat whatever was originally prescribed.
  achievedSets: number;
  // The lowest rep count they actually completed across all logged sets —
  // i.e. a rep target proven realistic across every set, not just their
  // best one. Used as the bodyweight equivalent of fallbackWeight when they
  // didn't meet target: reduce to this, don't repeat the target they missed.
  fallbackReps: number;
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
          .map(([exerciseName, perf]) => {
            if (perf.equipment === "bodyweight") {
              const prescriptionText =
                perf.prescribedSets != null && perf.prescribedReps != null
                  ? `was prescribed ${perf.prescribedSets} sets x ${perf.prescribedReps} reps`
                  : "had no prior prescription";

              const targetStatus = perf.didMeetTarget
                ? `TARGET MET OR EXCEEDED — they completed every prescribed set at or above the prescribed reps, actually achieving ${perf.achievedSets} sets x ${perf.reps} reps on their best set. This is a bodyweight exercise with no external load to increase — apply rep/set progression instead, based on what they ACTUALLY ACHIEVED (${perf.achievedSets} sets x ${perf.reps} reps), NOT the original prescription above — see BODYWEIGHT PROGRESSION RULES below.`
                : perf.isNearMiss
                  ? `NEAR MISS — they attempted every prescribed set and fell only slightly short on reps (a small shortfall, usually just the last, most fatigued set). This is normal session-to-session variance, not evidence the rep target itself is too high. Set "reps" to EXACTLY ${perf.reps} (what they actually achieved) and "sets" to ${perf.achievedSets} — repeat it, giving them another attempt. Do NOT increase, and do NOT drop down to a lower fallback target.`
                  : `TARGET NOT MET — at least one prescribed set fell short on reps by a meaningful margin, so they could not sustain that rep count across the full prescription. Their lowest completed set was ${perf.fallbackReps} reps. Set "reps" to EXACTLY ${perf.fallbackReps} for every set next time, sets unchanged at ${perf.prescribedSets ?? "the same count"}. Do NOT increase, and do NOT simply repeat the ${perf.prescribedReps ?? "previous"}-rep target they missed.`;

              return `- User's last logged performance for ${exerciseName} (bodyweight): ${prescriptionText}, their best completed set was ${perf.reps} reps. ${targetStatus}`;
            }

            const comparisonText =
              perf.recommendedWeightAtTime != null
                ? `was recommended ${perf.recommendedWeightAtTime} lbs and their best completed set was ${perf.weight} lbs x ${perf.reps} reps`
                : `logged ${perf.weight} lbs x ${perf.reps} reps (their best completed set — no recommendation was given that session)`;

            const heldWeight = perf.recommendedWeightAtTime ?? perf.weight;

            const targetStatus =
              perf.weightClassification === "full_success"
                ? "FULL SUCCESS — they completed every prescribed set at or above the prescribed weight and reps. Apply an upward progression increase (see IMPORTANT RULES below for how much)."
                : perf.weightClassification === "partial_success"
                  ? `PARTIAL SUCCESS — they logged FEWER sets than prescribed, but every set they DID log met or exceeded the prescribed weight and reps (best set: ${perf.weight} lbs x ${perf.reps} reps). This is real evidence they can handle more, just from fewer sets than a full session would prove — apply a smaller upward progression than a full success would get (roughly half the usual increase), not a hold and not a decrease.`
                : perf.weightClassification === "near_miss"
                  ? `NEAR MISS — they attempted every set at the full prescribed weight and fell only slightly short on reps, usually just on the last, most fatigued set. This is normal session-to-session variance, not evidence the weight is too heavy. Recommend ${heldWeight} lbs — the SAME weight as last time, giving them another attempt. Do NOT increase, and do NOT decrease.`
                  : perf.weightClassification === "moderate_miss"
                    ? `MODERATE MISS — either one earlier (non-final) set fell slightly short, or the final set fell short by a larger margin without collapsing. Not yet clear evidence the weight is too heavy, but not a clean success either. Recommend ${heldWeight} lbs — the SAME weight as last time, giving them another attempt before deciding to reduce it. Do NOT increase, and do NOT decrease.`
                    : `SIGNIFICANT MISS — a set was skipped, the weight itself was reduced, multiple sets fell meaningfully short, or a set collapsed well under its target. This is real evidence the weight is too heavy right now. Recommend ${perf.fallbackWeight} lbs — a working weight scaled down from their demonstrated 1RM for a full prescription at this rep target.${
                        perf.provenWeightFloor != null && perf.fallbackWeight < perf.provenWeightFloor && heldWeight > perf.provenWeightFloor
                          ? ` However, they have previously fully completed this exercise's prescription at ${perf.provenWeightFloor} lbs in an earlier session — NEVER recommend below that proven floor unless this miss happened AT ${perf.provenWeightFloor} lbs itself. Use ${perf.provenWeightFloor} lbs instead of ${perf.fallbackWeight} lbs here.`
                          : ""
                      } Do NOT increase, and do NOT simply repeat the weight they failed to sustain.`;

            return `- User's last logged performance for ${exerciseName}: ${comparisonText}, estimated 1RM: ${perf.estimated1RM} lbs${perf.provenWeightFloor != null ? `, previously fully completed a full prescription at ${perf.provenWeightFloor} lbs (their proven floor for this exercise)` : ""}. ${targetStatus}`;
          })
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

EXERCISE COUNT AND SELECTION REQUIREMENTS:
- Every training day must include AT LEAST 2 exercises for EACH assigned body part on that day, and NEVER fewer than 4 total exercises on any training day — a 3-exercise (or shorter) session is not acceptable, regardless of fitness level, session length, or training goal.
- For any day that trains "quads", "hamstrings", "glutes", "chest", "back", or "shoulders", you MUST include at least one primary compound/foundational lift for that body part from the ALLOWED EXERCISES list before adding any isolation or accessory work for it — e.g. a squat-pattern lift for quads, a hip-hinge lift for hamstrings/glutes, a bench/press variation for chest, a row or pulldown/pull-up for back, an overhead press for shoulders. Do not substitute an isolation exercise for this foundational lift just because one also appears in the allowed list — isolation work should supplement it, not replace it.
- This applies at every fitness level and training goal, including "strength" — "fewer total exercises" for strength/advanced training means fewer isolation add-ons, never dropping below the minimums above or skipping the body part's foundational lift.

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
        },
        {
          "exerciseName": "Incline Dumbbell Press",
          "muscleGroup": "chest",
          "sets": 3,
          "reps": 10,
          "restSeconds": 90,
          "notes": "Control the descent, press explosively on the way up.",
          "order": 2,
          "recommendedWeight": 45
        }
      ]
    },
    {
      "dayName": "TUE",
      "focus": "Rest",
      "isRestDay": true,
      "exercises": []
    }
  ]
}

NOTE ON THE EXAMPLE ABOVE: "Barbell Bench Press" has NO "recommendedWeight" key — that's what it looks like when the USER'S LOGGED PERFORMANCE HISTORY section does not contain that exact exercise name. "Incline Dumbbell Press" DOES have a "recommendedWeight" — that's what it looks like ONLY when the history section above does contain that exact exercise name. The presence of prior logged history for that EXACT exercise name is the ONLY thing that decides whether the key appears at all. This is not a stylistic choice — most exercises in most weeks will have NO "recommendedWeight" key, and that's expected and correct.

IMPORTANT RULES:
- "exerciseName" MUST be copied EXACTLY, character-for-character, from the ALLOWED EXERCISES list above. Do not combine, rename, merge, abbreviate, or paraphrase any exercise name — even if it seems like a reasonable variation. For example, if the list contains "Barbell Bent Over Row" and "One-Arm Dumbbell Row" as two separate items, do NOT invent a new name like "Dumbbell Bent Over Row" by blending them — pick one of the two exact names as listed, unmodified.
- Before finalizing your response, double-check every "exerciseName" value against the ALLOWED EXERCISES list — if any name does not appear verbatim in that list, replace it with the closest exact match from the list instead.
- "reps" must be a single whole number (e.g. 8, 10, 12) — NEVER a range like "6-8" or "8-10", and never a string.
- "focus" must always be a non-empty string. For training days, it should name the assigned body part(s) exactly (e.g. "Chest", "Back & Biceps"). For rest days, use "Rest" or "Active Recovery".
- "exercises" MUST be present on every single day, including rest days — use an empty array "[]" for rest days, never omit the key entirely.
- Each training day's exercises must ONLY target that day's assigned body part(s) — do not mix in unrelated muscle groups.
- Exercise selection, volume, and intensity must match the stated fitness level.
- For timed exercises (planks, holds), use "reps" as the number of seconds instead, still as a single whole number.
- "recommendedWeight" is OPTIONAL and only applies to weighted exercises. Include it ONLY when the USER'S LOGGED PERFORMANCE HISTORY section above contains a prior entry for that exact exercise name. If there is no prior history for an exercise (or it isn't a weighted exercise, like bodyweight holds), OMIT the "recommendedWeight" key entirely for that exercise — never guess or estimate one without history.
- DO NOT include "recommendedWeight" just because it seems helpful or because you know a typical/reasonable working weight for that exercise. For example, if "Dumbbell Bicep Curl" is in the ALLOWED EXERCISES list but the USER'S LOGGED PERFORMANCE HISTORY section does NOT mention "Dumbbell Bicep Curl" by that exact name — even if a different, similar-looking exercise like "Hammer Curls" does appear there — you MUST leave "recommendedWeight" out of the "Dumbbell Bicep Curl" object entirely. This is the first time this person is doing that exact exercise, so having no "recommendedWeight" on it is the CORRECT output, not a mistake to fix.
- Only apply a weight INCREASE if the exercise's history entry says "FULL SUCCESS" — i.e. their most recent logged session shows they completed ALL prescribed sets at or above both the recommended weight and prescribed rep count. Anything less (NEAR MISS, MODERATE MISS, or SIGNIFICANT MISS) must NOT increase — see the rules for each below.
- When applying an increase, base it on the weight they were recommended and actually lifted last time (not a fresh recalculation from their estimated 1RM), and use your judgment as a coach to pick a reasonable increment for that specific exercise, guided by:
  - Exercise type: smaller increments for isolation and upper-body exercises (e.g. bicep curls, lateral raises, tricep extensions — often 2.5-5 lbs or roughly 2-4%), larger increments for compound lower-body lifts (e.g. squats, deadlifts, hip thrusts — can reasonably be 5-10%), with compound upper-body lifts (bench press, overhead press, rows) somewhere in between.
  - Fitness level and training goal: lean toward the smaller end of these ranges for beginners or when the training goal is endurance/fat loss (higher reps, less emphasis on maximal loading), and toward the larger end for advanced lifters training for strength.
  - Guardrails that always apply regardless of exercise type: never increase by more than roughly 5-10% above the previous recommended weight in a single jump, and the new "recommendedWeight" must never be LOWER than what they already successfully lifted (that would contradict "FULL SUCCESS").
  - Always round the final number to a realistic gym increment — never a raw, oddly precise value. Use the nearest 5 lbs for barbell, dumbbell, or machine exercises (e.g. 202 → 200, 203 → 205), or the nearest 2.5 lbs for cable-based or bodyweight-added-resistance exercises.
- If the history entry says "NEAR MISS" or "MODERATE MISS", set "recommendedWeight" to EXACTLY the same weight stated in that entry (their previous recommendedWeight, or their logged weight if none) — repeat it, do not increase and do not decrease. Both of these mean every set was attempted (nothing skipped), and the shortfall was either small (a rep or two, usually on the last, most fatigued set) or isolated to one set — that's ordinary session-to-session variance, not proof the weight is too heavy, so the correct response is another attempt at the same load, not a cut.
- If the history entry says "SIGNIFICANT MISS", set "recommendedWeight" to EXACTLY the fallback weight (or proven-floor weight, if the entry says to use that instead) stated in that entry — with NO upward progression applied. Do not simply repeat the original prescribed weight they failed to sustain, do not use their best single set's weight unmodified, and do not guess at your own reduction — the entry already gives you the correct number, so just use it.
- CRITICAL: if the history entry states a "proven floor" (a weight this exercise has been fully completed at before, in some past session), the "recommendedWeight" you output must NEVER be lower than that floor, even after a significant miss — UNLESS the significant miss happened at that exact floor weight itself. A miss at a higher weight than the floor only proves that higher weight wasn't sustainable yet; it says nothing negative about the floor weight, which is already proven achievable.
- Concrete example of a near miss (this exact scenario has previously caused an incorrect recommendation — do not repeat it): a user's first-ever session of an exercise was 250 lbs x 4 sets x 8 reps, completed in full — FULL SUCCESS, so next time was correctly increased to 255 lbs x 4 sets x 8 reps. In that next session they logged Set 1: 255 x 8, Set 2: 255 x 8, Set 3: 255 x 8, Set 4: 255 x 7 — every set was attempted at the full 255 lbs, and the shortfall was a single rep on the last set. This is a NEAR MISS. The next "recommendedWeight" must be 255 lbs again (repeat it). It must NOT be cut to 240 lbs or any value below 250 lbs — 250 lbs was already proven fully achievable in the first session, so it is a hard floor here, and one rep of normal end-of-session fatigue at 255 lbs is not evidence that even 250 lbs is now too heavy. It must also NOT increase to 260+ lbs, since the target wasn't fully hit either.
- Concrete example of a moderate miss: an exercise was prescribed as 4 sets of 10 reps at 135 lbs, and the user logged Set 1: 135 x 10, Set 2: 135 x 8, Set 3: 135 x 10, Set 4: 135 x 10. Full weight was held throughout, and only one set (a non-final one) fell short, by 2 reps. This is a MODERATE MISS. The next "recommendedWeight" must repeat 135 lbs, not increase and not decrease.
- Concrete example of a significant miss: an exercise was prescribed as 4 sets of 8 reps at 220 lbs, and the user logged only 3 sets: Set 1: 220 x 8, Set 2: 220 x 8, Set 3: 215 x 6. A whole set was skipped AND the weight itself was dropped on the last one — this is a SIGNIFICANT MISS, not a near or moderate miss. The next "recommendedWeight" must NOT be 220 lbs (their failed weight) and must NOT be higher — it should be the fallback weight the history entry provides (roughly 205-210 lbs, scaled from their demonstrated 1RM for a realistic full 4x8 attempt), UNLESS a proven floor at or above that fallback is stated, in which case use the floor instead.
- Concrete example of a success: an intermediate lifter was recommended 185 lbs x 8 reps for Barbell Bench Press (a compound upper-body lift) and successfully logged 185 lbs x 8 reps on every prescribed set — FULL SUCCESS. A reasonable next "recommendedWeight" is a small increase like 190-195 lbs (roughly 3-5%), not a large jump to 205+ lbs and not simply repeating 185 lbs. For a compound lower-body lift like Barbell Back Squat in the same scenario, a somewhat larger jump (e.g. 5-10%) would be reasonable; for an isolation exercise like Dumbbell Bicep Curl at 25 lbs, a small fixed increment like 2.5-5 lbs is more appropriate than a percentage jump.

BODYWEIGHT PROGRESSION RULES (applies to every exercise whose history entry above is explicitly marked "(bodyweight)" — these have no external load, so "sets" and "reps" themselves are the progression variables instead of "recommendedWeight"):
- This is the standard double-progression model used in resistance training programming generally, adapted here because load can't be added: increase REPS first, and only increase SETS once reps reach a practical per-set ceiling of ${BODYWEIGHT_REP_CEILING}. Past that many reps in a single set, further gains lean into muscular endurance rather than the strength/hypertrophy stimulus most programs are targeting, and additional volume is better delivered as another set than an ever-longer single set.
- If the history entry says "TARGET MET OR EXCEEDED", base the increase on what they ACTUALLY ACHIEVED last time (the "actually achieving X sets x Y reps" figure in the history entry) — NOT the original prescribed sets/reps also stated there. Progressing from the original prescription instead of actual performance would repeat the exact same small bump forever instead of continuing to build on real progress session over session.
  - If what they actually achieved was BELOW ${BODYWEIGHT_REP_CEILING} reps, increase "reps" by roughly 10-20% versus that achieved number, rounded to a whole number, and never exceeding ${BODYWEIGHT_REP_CEILING}. Keep "sets" at what they actually achieved (which may be more than the original prescription, if they did extra).
  - If what they actually achieved was AT or ABOVE ${BODYWEIGHT_REP_CEILING} reps, keep "reps" at ${BODYWEIGHT_REP_CEILING} and instead increase "sets" by exactly 1 versus what they actually achieved, up to a maximum of ${BODYWEIGHT_MAX_SETS} sets. If already at ${BODYWEIGHT_MAX_SETS} sets and ${BODYWEIGHT_REP_CEILING} reps, hold both steady and rely on coaching notes to suggest a harder variation of the movement instead (e.g. elevating feet for push-ups, or a slower eccentric tempo) rather than continuing to add volume indefinitely.
  - Lean toward the lower end of the 10-20% rep increase range for beginners or for a strength-focused training goal (fewer, more effortful reps per set); lean toward the higher end for endurance or fat-loss goals, where higher rep counts are already the intent.
- If the history entry says "NEAR MISS": set "reps" and "sets" to EXACTLY the values stated in that entry (what they actually achieved) — repeat them, giving another attempt. A near miss means they attempted every set and fell only slightly short — that's normal variance, not proof the rep target itself is too high, so don't drop to a lower fallback and don't increase.
- If the history entry says "TARGET NOT MET": set "reps" to EXACTLY the fallback rep count stated in that entry for every set, and leave "sets" unchanged from their last prescription — do not increase either, and do not simply repeat the rep target they missed.
- Concrete example of a success: a user was prescribed 3 sets x 12 reps of Push-Ups (bodyweight) and completed all 3 sets at 12+ reps — TARGET MET. Since 12 reps is below the ${BODYWEIGHT_REP_CEILING}-rep ceiling, a reasonable next prescription is 3 sets x 14 reps (roughly a 15% increase), not 3 sets x 20 reps and not repeating 3 sets x 12 reps.
- Concrete example of hitting the ceiling: a user was prescribed 3 sets x 19 reps of Bodyweight Squats and completed all 3 sets — TARGET MET. Because 19 reps is already essentially at the ${BODYWEIGHT_REP_CEILING}-rep ceiling, the next prescription should hold reps near ${BODYWEIGHT_REP_CEILING} and instead move to 4 sets x ${BODYWEIGHT_REP_CEILING} reps, not push reps to 22-25.
- Concrete example of a near miss: an exercise was prescribed as 3 sets of 15 reps, and the user logged Set 1: 15 reps, Set 2: 15 reps, Set 3: 14 reps. Every set was attempted and the shortfall was a single rep on the last set — this is a NEAR MISS, not a real failure. The next prescription must repeat 3 sets x 14 reps (what they actually achieved), NOT drop further to something like 3 sets x 11 reps, and not increase either.
- Concrete example of a partial failure: an exercise was prescribed as 3 sets of 15 reps, and the user logged Set 1: 15 reps, Set 2: 15 reps, Set 3: 11 reps. Because Set 3 fell short by a meaningful margin (not just a rep or two), this is TARGET NOT MET, not a near miss. The next prescription must be 3 sets x 11 reps (their lowest completed set), not 3 sets x 15 reps repeated and not a higher number.

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
