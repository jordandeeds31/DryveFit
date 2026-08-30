import prisma from "../../lib/prisma";
import openai from "../../lib/openai";
import AppError from "../../utils/AppError";
import { getDiaryForDate } from "../nutrition/nutrition.service";
import { getScheduleForUser } from "../programs/programs.service";

// Same "local calendar day from a YYYY-MM-DD string" convention as
// nutrition.service.ts's parseDateKey/workoutLogs.service.ts/
// programs.service.ts — duplicated rather than imported since none of
// those export it; matches the project's existing pattern of each module
// owning its own copy.
const parseDateKey = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type NutritionStatus = "on_target" | "over" | "under" | "no_data";
export type ProteinStatus = "met" | "under" | "no_data";
export type WorkoutStatus =
  | "completed"
  | "partial"
  | "skipped"
  | "unplanned_extra"
  | "rest_day_as_scheduled"
  | "no_data";
export type NetContribution = "positive" | "negative" | "neutral";
export type DayType = "analyzed" | "no_data";

export interface DailyAnalysisResult {
  dayType: DayType;
  nutritionStatus: NutritionStatus;
  proteinStatus: ProteinStatus;
  workoutStatus: WorkoutStatus;
  netContribution: NetContribution;
  facts: {
    goalType: string | null;
    currentWeightLbs: number | null;
    calorieGoal: number | null;
    calorieActual: number;
    proteinGoal: number | null;
    proteinActual: number;
    carbsActual: number;
    fatActual: number;
    workoutTitle: string | null;
    completedCount: number;
    totalCount: number;
    hasStandaloneLog: boolean;
    // How many of the 7 calendar days up to and including today had any
    // training signal (a completed exercise or a standalone log) — read
    // together with today's own workoutStatus so a rest/no-data day gets
    // judged against the actual recent pattern, not in isolation. Doesn't
    // affect netContribution (still driven only by today), only what the
    // LLM is told when explaining it.
    trainedDaysLast7: number;
  };
}

const CALORIE_TOLERANCE = 0.1; // ±10% of daily calorie goal counts as "on target"
const PROTEIN_MET_THRESHOLD = 0.9; // ≥90% of protein goal counts as "met"

// Whether missing calories in a given direction actually works against
// THIS goal type — under-eating is a bonus for a cut but a miss for a
// bulk, so "which direction is bad" can't be a single global rule. A
// lookup table keeps this an explicit, auditable decision rather than
// something buried in if/else branches (or worse, left for the LLM to
// judge).
const OVER_IS_MISS_FOR: Record<string, boolean> = {
  lose: true,
  maintain: true,
  recomp: true,
  gain: false,
  build_muscle: false,
};
const UNDER_IS_MISS_FOR: Record<string, boolean> = {
  lose: false,
  maintain: true,
  recomp: true,
  gain: true,
  build_muscle: true,
};

const daysBefore = (dateStr: string, count: number): string[] => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const keys: string[] = [];
  for (let offset = 0; offset < count; offset++) {
    const d = new Date(year, month - 1, day - offset);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return keys;
};

const countTrainedDaysInLast7 = (
  schedule: Awaited<ReturnType<typeof getScheduleForUser>>,
  dateStr: string,
): number => {
  const last7 = new Set(daysBefore(dateStr, 7));
  return schedule.filter(
    (day) =>
      last7.has(day.date) &&
      (day.hasStandaloneLog || day.programDays.some((d) => d.completedCount > 0)),
  ).length;
};

// Pure and deterministic — no LLM call happens in here. This is the part
// that decides the actual verdict; generateExplanation below only ever
// explains a result this function already produced, and has no way to
// change it (its own response schema has no verdict field at all).
export const computeDailyAnalysis = async (
  userId: string,
  dateStr: string,
): Promise<DailyAnalysisResult> => {
  const [diary, schedule] = await Promise.all([
    getDiaryForDate(userId, dateStr),
    getScheduleForUser(userId),
  ]);

  const todaysSchedule = schedule.find((day) => day.date === dateStr);
  const hasLoggedFood = diary.totals.calories > 0;
  const hasWorkoutSignal =
    !!todaysSchedule &&
    (todaysSchedule.programDays.length > 0 || todaysSchedule.hasStandaloneLog);
  const trainedDaysLast7 = countTrainedDaysInLast7(schedule, dateStr);

  const emptyFacts = {
    goalType: null,
    currentWeightLbs: null,
    calorieGoal: diary.goal?.calories ?? null,
    calorieActual: 0,
    proteinGoal: diary.goal?.proteinG ?? null,
    proteinActual: 0,
    carbsActual: 0,
    fatActual: 0,
    workoutTitle: null,
    completedCount: 0,
    totalCount: 0,
    hasStandaloneLog: false,
    trainedDaysLast7,
  };

  // A no-data day is checked FIRST and short-circuits everything below —
  // it's neither a pass nor a fail, it's its own distinct case (see the
  // architecture discussion). Never scored as neutral/negative.
  if (!hasLoggedFood && !hasWorkoutSignal) {
    return {
      dayType: "no_data",
      nutritionStatus: "no_data",
      proteinStatus: "no_data",
      workoutStatus: "no_data",
      netContribution: "neutral",
      facts: emptyFacts,
    };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { nutritionGoalType: true, weightLbs: true },
  });
  // Defaults to build_muscle rather than maintain when unset — that's
  // the only goal actually in use right now (v1 scope, per direct
  // request), and the profile's own weightLbs is already available as
  // context without needing a separate target-weight field.
  const goalType = user.nutritionGoalType ?? "build_muscle";

  let nutritionStatus: NutritionStatus = "no_data";
  if (diary.goal?.calories) {
    const ratio = diary.totals.calories / diary.goal.calories;
    if (ratio > 1 + CALORIE_TOLERANCE) nutritionStatus = "over";
    else if (ratio < 1 - CALORIE_TOLERANCE) nutritionStatus = "under";
    else nutritionStatus = "on_target";
  }

  let proteinStatus: ProteinStatus = "no_data";
  if (diary.goal?.proteinG) {
    proteinStatus =
      diary.totals.proteinG >= diary.goal.proteinG * PROTEIN_MET_THRESHOLD
        ? "met"
        : "under";
  }

  let workoutStatus: WorkoutStatus = "no_data";
  let workoutTitle: string | null = null;
  let completedCount = 0;
  let totalCount = 0;
  if (todaysSchedule && todaysSchedule.programDays.length > 0) {
    completedCount = todaysSchedule.programDays.reduce(
      (sum, day) => sum + day.completedCount,
      0,
    );
    totalCount = todaysSchedule.programDays.reduce((sum, day) => sum + day.totalCount, 0);
    workoutTitle = todaysSchedule.programDays.map((day) => day.title).join(", ");
    if (totalCount === 0) workoutStatus = "rest_day_as_scheduled";
    else if (completedCount === 0) workoutStatus = "skipped";
    else if (completedCount < totalCount) workoutStatus = "partial";
    else workoutStatus = "completed";
  } else if (todaysSchedule?.hasStandaloneLog) {
    workoutStatus = "unplanned_extra";
  }

  const nutritionIsMiss =
    (nutritionStatus === "over" && OVER_IS_MISS_FOR[goalType]) ||
    (nutritionStatus === "under" && UNDER_IS_MISS_FOR[goalType]);
  const proteinIsMiss = proteinStatus === "under";
  const workoutIsMiss = workoutStatus === "skipped" || workoutStatus === "partial";

  let netContribution: NetContribution;
  if (nutritionIsMiss || proteinIsMiss || workoutIsMiss) {
    // Any single genuine miss pulls the whole day negative — a day never
    // gets softened into "neutral" just because other factors were fine.
    netContribution = "negative";
  } else if (
    (nutritionStatus === "on_target" || nutritionStatus === "no_data") &&
    (proteinStatus === "met" || proteinStatus === "no_data") &&
    (workoutStatus === "completed" ||
      workoutStatus === "unplanned_extra" ||
      workoutStatus === "rest_day_as_scheduled" ||
      workoutStatus === "no_data")
  ) {
    netContribution = "positive";
  } else {
    netContribution = "neutral";
  }

  return {
    dayType: "analyzed",
    nutritionStatus,
    proteinStatus,
    workoutStatus,
    netContribution,
    facts: {
      goalType: user.nutritionGoalType,
      currentWeightLbs: user.weightLbs,
      calorieGoal: diary.goal?.calories ?? null,
      calorieActual: diary.totals.calories,
      proteinGoal: diary.goal?.proteinG ?? null,
      proteinActual: diary.totals.proteinG,
      carbsActual: diary.totals.carbsG,
      fatActual: diary.totals.fatG,
      workoutTitle,
      completedCount,
      totalCount,
      hasStandaloneLog: todaysSchedule?.hasStandaloneLog ?? false,
      trainedDaysLast7,
    },
  };
};

const HEADLINES: Record<NetContribution, string> = {
  positive: "Today supported your goal",
  negative: "Today worked against your goal",
  neutral: "Today was a mixed bag",
};

interface GeneratedExplanation {
  explanation: string;
  adjustments: string[];
}

const EXPLANATION_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "daily_analysis_explanation",
    strict: true,
    schema: {
      type: "object",
      properties: {
        explanation: { type: "string" },
        adjustments: { type: "array", items: { type: "string" } },
      },
      required: ["explanation", "adjustments"],
      additionalProperties: false,
    },
  },
};

// The LLM's only job is to explain a verdict it is handed — its response
// schema has no field through which it could report a different
// netContribution than the one computeDailyAnalysis already decided.
const generateExplanation = async (
  result: DailyAnalysisResult,
): Promise<GeneratedExplanation> => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          'You write a short, honest daily summary for a fitness app user. A verdict (netContribution: "positive", "negative", or "neutral") has ALREADY been decided by deterministic rules before you see this — your only job is to explain WHY in plain, direct, second-person language using the specific numbers given below. Never soften a negative verdict into vague positivity, and never invent reasons, causes, or context not present in the data (no mentions of sleep, stress, hydration, motivation, or anything else not listed — these are not tracked by this app). Weigh today\'s workoutStatus together with facts.trainedDaysLast7 (how many of the last 7 days had any training logged) rather than judging today\'s training in isolation — e.g. a rest/no-data day after several consecutive trained days reads differently than the same day after a week with none. If workoutStatus is "no_data", say plainly that no workout was logged today (optionally noting the last-7-days count for context) — never claim or imply the user "did not engage in physical activity" or otherwise assert something about their activity beyond what today\'s data actually shows. If netContribution is "negative", return 2-3 concrete adjustments for tomorrow, each tied directly to a specific factor that actually fell short. If "positive" or "neutral", return an empty adjustments array. Keep the explanation to 2-4 sentences.',
      },
      { role: "user", content: JSON.stringify(result) },
    ],
    response_format: EXPLANATION_RESPONSE_FORMAT,
  });

  const raw = completion.choices[0].message.content;
  if (!raw) {
    throw new AppError(502, "Couldn't generate today's analysis — try again");
  }
  return JSON.parse(raw);
};

const NO_DATA_EXPLANATION =
  "You didn't log any meals or workouts today, so there's nothing to analyze. Log something tomorrow and you'll get a real read on how it's tracking toward your goal.";

export interface DailyAnalysisDto {
  id: string;
  date: string;
  dayType: string;
  nutritionStatus: string | null;
  proteinStatus: string | null;
  workoutStatus: string | null;
  netContribution: string | null;
  headline: string;
  explanation: string;
  adjustments: string[];
  viewedAt: string | null;
  createdAt: string;
}

interface DailyAnalysisRow {
  id: string;
  date: Date;
  dayType: string;
  nutritionStatus: string | null;
  proteinStatus: string | null;
  workoutStatus: string | null;
  netContribution: string | null;
  headline: string;
  explanation: string;
  adjustments: unknown;
  viewedAt: Date | null;
  createdAt: Date;
}

const toDto = (row: DailyAnalysisRow): DailyAnalysisDto => ({
  id: row.id,
  date: toLocalDateKey(row.date),
  dayType: row.dayType,
  nutritionStatus: row.nutritionStatus,
  proteinStatus: row.proteinStatus,
  workoutStatus: row.workoutStatus,
  netContribution: row.netContribution,
  headline: row.headline,
  explanation: row.explanation,
  adjustments: (row.adjustments as string[] | null) ?? [],
  viewedAt: row.viewedAt ? row.viewedAt.toISOString() : null,
  createdAt: row.createdAt.toISOString(),
});

// Manually-triggerable v1 — computes (or recomputes, via upsert) and
// persists one day's analysis on demand. No cron/push wiring yet; that's
// the next layer once the trigger-time/push-vs-in-app product decisions
// are settled (see architecture proposal discussion).
export const runDailyAnalysisForUser = async (
  userId: string,
  dateStr: string,
): Promise<DailyAnalysisDto> => {
  const result = await computeDailyAnalysis(userId, dateStr);

  let headline: string;
  let explanation: string;
  let adjustments: string[];

  if (result.dayType === "no_data") {
    headline = "Nothing logged today";
    explanation = NO_DATA_EXPLANATION;
    adjustments = [];
  } else {
    headline = HEADLINES[result.netContribution];
    const generated = await generateExplanation(result);
    explanation = generated.explanation;
    adjustments = generated.adjustments;
  }

  const date = parseDateKey(dateStr);

  const saved = await prisma.dailyAnalysis.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      dayType: result.dayType,
      nutritionStatus: result.nutritionStatus,
      proteinStatus: result.proteinStatus,
      workoutStatus: result.workoutStatus,
      netContribution: result.netContribution,
      headline,
      explanation,
      adjustments,
      rawInputs: result as unknown as object,
    },
    update: {
      dayType: result.dayType,
      nutritionStatus: result.nutritionStatus,
      proteinStatus: result.proteinStatus,
      workoutStatus: result.workoutStatus,
      netContribution: result.netContribution,
      headline,
      explanation,
      adjustments,
      rawInputs: result as unknown as object,
      // Re-running (e.g. re-testing after logging more data) should
      // surface as unseen again, not stay silently marked viewed.
      viewedAt: null,
    },
  });

  return toDto(saved);
};

export const getDailyAnalysis = async (
  userId: string,
  dateStr: string,
): Promise<DailyAnalysisDto | null> => {
  const date = parseDateKey(dateStr);
  const row = await prisma.dailyAnalysis.findUnique({
    where: { userId_date: { userId, date } },
  });
  return row ? toDto(row) : null;
};

export const markDailyAnalysisViewed = async (
  userId: string,
  id: string,
): Promise<void> => {
  await prisma.dailyAnalysis.updateMany({
    where: { id, userId, viewedAt: null },
    data: { viewedAt: new Date() },
  });
};
