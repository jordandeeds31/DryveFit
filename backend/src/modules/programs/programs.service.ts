import prisma from "../../lib/prisma";
import openai from "../../lib/openai";
import AppError from "../../utils/AppError";
import {
  assertNotFutureLog,
  UNRESTRICTED_TEST_EMAIL,
} from "../../utils/futureLogGuard";
import {
  PROGRAM_DURATION_DAYS,
  ProgramDurationDays,
  TRAINING_SPLITS,
  TrainingSplit,
  SPLIT_TEMPLATES,
  getSplitBodyParts,
  FITNESS_LEVELS,
  FitnessLevel,
  EQUIPMENT_ACCESS,
  EquipmentAccess,
  EQUIPMENT_ACCESS_FILTERS,
  TRAINING_GOALS,
  TrainingGoal,
  ExercisePerformance,
  SessionClassification,
  getWeeksPlan,
  buildWeekPrompt,
  getDayVolumeTarget,
  assignSplitToDays,
  normalizeDay,
  getWeightIncrement,
  roundToNearestIncrement,
  BODYWEIGHT_REP_CEILING,
  BODYWEIGHT_MAX_SETS,
  REAL_DAY_NAMES,
  getDayRegions,
} from "./programs.prompts";
import { weekResponseSchema } from "./programs.schema";
import { CreateProgramInput } from "./programs.types";
import { toProxiedImagePath } from "../exercises/exercises.service";

const validateTrainingSplit = (trainingSplit: string) => {
  if (!TRAINING_SPLITS.includes(trainingSplit as TrainingSplit)) {
    throw new AppError(
      400,
      `Invalid training split. Must be one of: ${TRAINING_SPLITS.join(", ")}`,
    );
  }
};

const validateFitnessLevel = (fitnessLevel: string) => {
  if (!FITNESS_LEVELS.includes(fitnessLevel as FitnessLevel)) {
    throw new AppError(
      400,
      `Invalid fitness level. Must be one of: ${FITNESS_LEVELS.join(", ")}`,
    );
  }
};

const validateEquipmentAccess = (equipmentAccess: string) => {
  if (!EQUIPMENT_ACCESS.includes(equipmentAccess as EquipmentAccess)) {
    throw new AppError(
      400,
      `Invalid equipment access. Must be one of: ${EQUIPMENT_ACCESS.join(", ")}`,
    );
  }
};

const validateTrainingGoal = (trainingGoal: string) => {
  if (!TRAINING_GOALS.includes(trainingGoal as TrainingGoal)) {
    throw new AppError(
      400,
      `Invalid training goal. Must be one of: ${TRAINING_GOALS.join(", ")}`,
    );
  }
};

const hasStandaloneWorkoutLogOnDate = async (
  userId: string,
  date: Date,
): Promise<boolean> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingLog = await prisma.workoutLog.findFirst({
    where: {
      userId,
      loggedAt: { gte: startOfDay, lte: endOfDay },
      exercises: {
        some: {},
        every: { programExerciseId: null },
      },
    },
    select: { id: true },
  });

  return !!existingLog;
};

const validateProgramDates = async (input: {
  userId: string;
  startDate: Date;
  durationDays: number;
  preferredDays: string[];
}) => {
  const { userId, startDate, durationDays, preferredDays } = input;

  if (preferredDays.length === 0) {
    throw new AppError(400, "Select at least one preferred day");
  }

  if (!PROGRAM_DURATION_DAYS.includes(durationDays as ProgramDurationDays)) {
    throw new AppError(400, "Duration must be 30, 60, or 90 days");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDate < today) {
    throw new AppError(400, "Start date cannot be in the past");
  }

  // Don't let the program's first training day land on a date the user
  // already logged an unrelated, ad-hoc workout — push the start date
  // forward one day at a time until it lands on a clear day.
  const adjustedStartDate = new Date(startDate);
  while (await hasStandaloneWorkoutLogOnDate(userId, adjustedStartDate)) {
    adjustedStartDate.setDate(adjustedStartDate.getDate() + 1);
  }

  const endDate = new Date(adjustedStartDate);
  endDate.setDate(endDate.getDate() + durationDays);

  const overlapping = await prisma.program.findFirst({
    where: {
      userId,
      isActive: true,
      startDate: { lt: endDate },
      endDate: { gt: adjustedStartDate },
    },
  });

  if (overlapping) {
    throw new AppError(400, "Selected dates overlap with an existing program");
  }

  return { startDate: adjustedStartDate, endDate };
};

const buildDefaultProgramName = (input: {
  durationDays: number;
  trainingSplit: TrainingSplit;
}): string => {
  const splitLabel = input.trainingSplit.replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  );

  return `${input.durationDays}-Day ${splitLabel} Program`;
};

const getAllowedExerciseNames = async (
  trainingSplit: TrainingSplit,
  equipmentAccess: EquipmentAccess,
): Promise<string[]> => {
  const allowedEquipment = EQUIPMENT_ACCESS_FILTERS[equipmentAccess];
  const bodyParts = getSplitBodyParts(trainingSplit);

  const exercises = await prisma.exercise.findMany({
    where: {
      muscleGroup: { in: bodyParts },
      ...(allowedEquipment ? { equipment: { in: allowedEquipment } } : {}),
    },
    select: { name: true },
  });

  return exercises.map((e) => e.name);
};

const estimate1RM = (weight: number, reps: number): number =>
  Math.round(weight * (1 + reps / 30));

// Scales recommended weight between 85% of 1RM (low reps, ~6) and 70% of
// 1RM (high reps, ~12+), matching the same heuristic given to the AI at
// program-generation time — used to backfill a recommendation for exercises
// that were generated before any performance history existed for them.
const estimateRecommendedWeight = (
  estimated1RM: number,
  prescribedReps: number,
  equipment: string | null | undefined,
): number => {
  const LOW_REPS = 6;
  const HIGH_REPS = 12;
  const LOW_REPS_PERCENT = 0.85;
  const HIGH_REPS_PERCENT = 0.7;

  const clampedReps = Math.min(Math.max(prescribedReps, LOW_REPS), HIGH_REPS);
  const t = (clampedReps - LOW_REPS) / (HIGH_REPS - LOW_REPS);
  const percent = LOW_REPS_PERCENT - t * (LOW_REPS_PERCENT - HIGH_REPS_PERCENT);

  return roundToNearestIncrement(
    estimated1RM * percent,
    getWeightIncrement(equipment),
  );
};

// Estimates a working weight the user could realistically complete for a
// FULL prescription (all sets, full rep count) from their true 1RM —
// deliberately more conservative than estimateRecommendedWeight above,
// since this is only used as a fallback after they already failed to
// sustain a heavier weight across every prescribed set. Reusable for any
// exercise: callers just pass that exercise's own prescribed reps and the
// 1RM estimated from their most recent best completed set.
const calculateWorkingWeightForPrescription = (
  estimated1RM: number,
  prescribedReps: number,
  equipment: string | null | undefined,
): number => {
  const LOW_REPS = 6;
  const HIGH_REPS = 12;
  const LOW_REPS_PERCENT = 0.8;
  const HIGH_REPS_PERCENT = 0.65;

  const clampedReps = Math.min(Math.max(prescribedReps, LOW_REPS), HIGH_REPS);
  const t = (clampedReps - LOW_REPS) / (HIGH_REPS - LOW_REPS);
  const percent = LOW_REPS_PERCENT - t * (LOW_REPS_PERCENT - HIGH_REPS_PERCENT);

  return roundToNearestIncrement(
    estimated1RM * percent,
    getWeightIncrement(equipment),
  );
};

// Progression for a partial_success session: fewer sets were logged than
// prescribed, but every logged set met or exceeded the prescription — real
// evidence of capability, just from less volume than a full session would
// prove. Splits the difference between estimateRecommendedWeight's
// confident curve (85%→70%) and calculateWorkingWeightForPrescription's
// conservative one (80%→65%): progress, but by less than a full success
// would earn.
const estimatePartialSuccessWeight = (
  estimated1RM: number,
  prescribedReps: number,
  equipment: string | null | undefined,
): number => {
  const LOW_REPS = 6;
  const HIGH_REPS = 12;
  const LOW_REPS_PERCENT = 0.825;
  const HIGH_REPS_PERCENT = 0.675;

  const clampedReps = Math.min(Math.max(prescribedReps, LOW_REPS), HIGH_REPS);
  const t = (clampedReps - LOW_REPS) / (HIGH_REPS - LOW_REPS);
  const percent = LOW_REPS_PERCENT - t * (LOW_REPS_PERCENT - HIGH_REPS_PERCENT);

  return roundToNearestIncrement(
    estimated1RM * percent,
    getWeightIncrement(equipment),
  );
};

interface SetOutcome {
  reps: number;
  weight: number | null;
}

const NEAR_MISS_MAX_SHORTFALL = 2;
const MODERATE_NONFINAL_MAX_SHORTFALL = 2;
const WEIGHT_REDUCTION_SIGNIFICANT_PERCENT = 0.1;

const classifyWeightedSession = (
  prescribedSets: number,
  prescribedReps: number,
  prescribedWeight: number | null,
  achievedSets: SetOutcome[],
): SessionClassification => {
  // Fewer sets logged than prescribed is ambiguous on its own — it could
  // mean fatigue or a cut-short workout, but could just as easily mean
  // fewer, heavier-than-required sets. That's very different from a set
  // that was actually attempted and fell short, so it must not be lumped
  // in with genuine failure below. If every logged set still met or
  // exceeded both the prescribed weight and reps, that's real (if
  // incomplete) evidence of capability — partial_success. Only treat the
  // missing sets as a true failure signal if what WAS logged also fell
  // short.
  if (achievedSets.length < prescribedSets) {
    const everyLoggedSetMetTarget = achievedSets.every(
      (set) =>
        set.reps >= prescribedReps &&
        (prescribedWeight == null || (set.weight ?? 0) >= prescribedWeight),
    );
    return everyLoggedSetMetTarget ? "partial_success" : "significant_miss";
  }

  if (prescribedWeight != null) {
    const weightShortfalls = achievedSets.map((set) =>
      Math.max(0, prescribedWeight - (set.weight ?? 0)),
    );
    const setsWithReducedWeight = weightShortfalls.filter((s) => s > 0).length;
    const maxWeightReduction = Math.max(...weightShortfalls);

    if (
      setsWithReducedWeight >= 2 ||
      maxWeightReduction > prescribedWeight * WEIGHT_REDUCTION_SIGNIFICANT_PERCENT
    ) {
      return "significant_miss";
    }
    if (setsWithReducedWeight === 1) {
      // A minor reduction on one set is a real (if small) sign of struggle
      // — hold rather than progress, but not a full regression either.
      return "moderate_miss";
    }
  }

  const repShortfalls = achievedSets.map((set) =>
    Math.max(0, prescribedReps - set.reps),
  );
  const totalShortfall = repShortfalls.reduce((sum, s) => sum + s, 0);
  if (totalShortfall === 0) return "full_success";

  const lastIndex = repShortfalls.length - 1;
  const finalShortfall = repShortfalls[lastIndex];
  const nonFinalShortfalls = repShortfalls.slice(0, lastIndex);
  const missedNonFinalSets = nonFinalShortfalls.filter((s) => s > 0);

  if (missedNonFinalSets.length === 0 && finalShortfall > 0) {
    if (finalShortfall <= NEAR_MISS_MAX_SHORTFALL) return "near_miss";
    // Missed by more on the final set, but still completed at least half
    // the prescribed reps — a bigger fade, not a collapse.
    const finalSetReps = achievedSets[lastIndex].reps;
    return finalSetReps >= prescribedReps / 2 ? "moderate_miss" : "significant_miss";
  }

  if (
    missedNonFinalSets.length === 1 &&
    missedNonFinalSets[0] <= MODERATE_NONFINAL_MAX_SHORTFALL &&
    finalShortfall === 0
  ) {
    return "moderate_miss";
  }

  return "significant_miss";
};

// Code-side equivalent of estimateRecommendedWeight/calculateWorkingWeightForPrescription,
// for exercises with no external load: the double-progression model —
// increase reps toward a practical per-set ceiling, then progress via
// added sets once at it. Mirrors the BODYWEIGHT PROGRESSION RULES given to
// the AI in programs.prompts.ts, computed deterministically here so a
// bodyweight exercise's prescription actually reacts to logged performance
// on every view instead of staying frozen at whatever the AI guessed
// up front, before any real performance existed for it.
//
// baselineSets/baselineReps must be what was actually ACHIEVED last time,
// not what was originally prescribed — this result is never persisted back
// to the ProgramExercise row, so the next occurrence's "prescribed" value
// in the DB stays frozen forever. Progressing from the frozen prescription
// instead of actual performance would make every future occurrence
// re-derive the exact same single bump rather than compounding session
// over session, the same way weighted progression must be based on
// estimated1RM (derived from actual lifts), not the frozen prescription.
const calculateBodyweightProgression = (
  baselineSets: number,
  baselineReps: number,
  didMeetTarget: boolean,
  isNearMiss: boolean,
  fallbackReps: number,
): { sets: number; reps: number } => {
  if (!didMeetTarget) {
    // A near miss (fell only a rep or two short, usually on the last set)
    // is normal variance, not proof the target itself was too high — hold
    // it steady for another attempt instead of dropping to the fallback.
    return { sets: baselineSets, reps: isNearMiss ? baselineReps : fallbackReps };
  }

  if (baselineReps < BODYWEIGHT_REP_CEILING) {
    // ~15% increase, but always at least +1 rep so low starting rep counts
    // (e.g. 5) still make forward progress rather than rounding to no-op.
    const increasedReps = Math.min(
      BODYWEIGHT_REP_CEILING,
      Math.max(baselineReps + 1, Math.round(baselineReps * 1.15)),
    );
    return { sets: baselineSets, reps: increasedReps };
  }

  return {
    sets: Math.min(BODYWEIGHT_MAX_SETS, baselineSets + 1),
    reps: BODYWEIGHT_REP_CEILING,
  };
};

// For each exercise name, finds the user's most recent logged session and
// returns the best (highest estimated-1RM) set from that session — this is
// the performance context fed to the AI when recommending next weights.
const getRecentPerformanceByExerciseName = async (
  userId: string,
  exerciseNames: string[],
  excludeProgramExerciseIds: string[] = [],
  // When set, only logs strictly before this date count as "history" — so a
  // program day doesn't pick up a recommendation from a log dated AFTER it
  // (e.g. an earlier occurrence of the same exercise shouldn't inherit a
  // recommendation computed from a later session).
  beforeDate?: Date,
): Promise<Record<string, ExercisePerformance>> => {
  if (exerciseNames.length === 0) return {};

  const catalogEntries = await prisma.exercise.findMany({
    where: { name: { in: exerciseNames } },
    select: { name: true, equipment: true },
  });
  const equipmentByName = new Map(
    catalogEntries.map((entry) => [entry.name, entry.equipment]),
  );

  const logs = await prisma.exerciseLog.findMany({
    where: {
      exerciseName: { in: exerciseNames },
      workoutLog: {
        userId,
        ...(beforeDate ? { loggedAt: { lt: beforeDate } } : {}),
      },
      // Exclude the very occurrence(s) we're computing a recommendation
      // for — otherwise a user's first-ever log of an exercise would
      // immediately count as "prior history" for that same occurrence.
      // Standalone logs (programExerciseId: null) must stay included —
      // `notIn` alone would silently drop them due to SQL NULL semantics.
      ...(excludeProgramExerciseIds.length > 0
        ? {
            OR: [
              { programExerciseId: null },
              { programExerciseId: { notIn: excludeProgramExerciseIds } },
            ],
          }
        : {}),
    },
    include: {
      sets: true,
      workoutLog: { select: { loggedAt: true } },
      programExercise: {
        select: { sets: true, reps: true, recommendedWeight: true },
      },
    },
    orderBy: { workoutLog: { loggedAt: "desc" } },
  });

  const performanceByName: Record<string, ExercisePerformance> = {};
  // Tracks, across ALL past sessions for each name (not just the most
  // recent one), the highest weight at which the FULL prescription was
  // ever completed — the hard floor a recommendation must never drop
  // below except on a genuine significant miss at that same weight.
  const provenWeightFloorByName: Record<string, number> = {};

  for (const log of logs) {
    // Bodyweight sets are logged with no weight at all — only reps are
    // meaningful for them, so weight must not be required for a set to
    // count as valid, or every bodyweight session would be silently
    // dropped from performance history.
    const isBodyweight = equipmentByName.get(log.exerciseName) === "bodyweight";
    const validSets = log.sets
      .filter((set) =>
        isBodyweight ? set.reps != null : set.weight != null && set.reps != null,
      )
      .sort((a, b) => a.setNumber - b.setNumber);
    if (validSets.length === 0) continue;

    const prescription = log.programExercise;
    const metFullPrescription = prescription
      ? validSets.length >= prescription.sets &&
        validSets.every(
          (set) =>
            set.reps! >= prescription.reps &&
            (prescription.recommendedWeight == null ||
              set.weight! >= prescription.recommendedWeight),
        )
      : true;

    // Scan every session (not just the most recent) for the floor — a
    // fully successful session from several occurrences ago still proves
    // that weight is achievable, even if a more recent session struggled.
    if (!isBodyweight && prescription && metFullPrescription) {
      const provenWeight = Math.min(...validSets.map((set) => set.weight!));
      provenWeightFloorByName[log.exerciseName] = Math.max(
        provenWeightFloorByName[log.exerciseName] ?? 0,
        provenWeight,
      );
    }

    if (performanceByName[log.exerciseName]) continue; // full detail only needed for the most recent session

    const bestSet = isBodyweight
      ? validSets.reduce((best, set) => (set.reps! > best.reps! ? set : best))
      : validSets.reduce((best, set) =>
          estimate1RM(set.weight!, set.reps!) >
          estimate1RM(best.weight!, best.reps!)
            ? set
            : best,
        );

    // Every prescribed set must be met — not just some, not an average.
    // Standalone logs (no linked programExercise) have nothing prescribed
    // to fall short of, so they're treated as met by default.
    const didMeetTarget = metFullPrescription;

    // A missed set doesn't automatically mean the load itself was too
    // heavy — falling one or two reps short on a single set (usually the
    // last, most fatigued one) after attempting every set at the full
    // prescribed weight is normal session-to-session variance, not a sign
    // of overreach. Full regression is reserved for a genuinely failed
    // session: skipped sets, reduced weight, or a larger rep shortfall.
    // (This coarser check still backs the bodyweight path below — the
    // weighted path uses the full five-tier weightClassification instead.)
    const NEAR_MISS_MAX_TOTAL_SHORTFALL = 2;
    const NEAR_MISS_MAX_SINGLE_SET_SHORTFALL = 2;
    const attemptedEverySet = prescription
      ? validSets.length >= prescription.sets
      : true;
    const heldPrescribedWeight =
      isBodyweight ||
      !prescription ||
      prescription.recommendedWeight == null ||
      validSets.every((set) => set.weight! >= prescription.recommendedWeight!);
    const repShortfalls = prescription
      ? validSets.map((set) => Math.max(0, prescription.reps - set.reps!))
      : [];
    const totalRepShortfall = repShortfalls.reduce((sum, s) => sum + s, 0);
    const worstSetShortfall = repShortfalls.length
      ? Math.max(...repShortfalls)
      : 0;
    const isNearMiss =
      !didMeetTarget &&
      !!prescription &&
      attemptedEverySet &&
      heldPrescribedWeight &&
      totalRepShortfall <= NEAR_MISS_MAX_TOTAL_SHORTFALL &&
      worstSetShortfall <= NEAR_MISS_MAX_SINGLE_SET_SHORTFALL;

    const weightClassification: SessionClassification | null =
      !isBodyweight && prescription
        ? classifyWeightedSession(
            prescription.sets,
            prescription.reps,
            prescription.recommendedWeight,
            validSets.map((set) => ({ reps: set.reps!, weight: set.weight })),
          )
        : null;

    const sessionEstimated1RM = estimate1RM(bestSet.weight!, bestSet.reps!);

    // A working weight they could realistically complete for the FULL
    // original prescription (not just their single best set) — based on
    // the prescribed rep target if we have one, falling back to the reps
    // they actually hit if this exercise has no linked prescription.
    const fallbackWeight = calculateWorkingWeightForPrescription(
      sessionEstimated1RM,
      prescription?.reps ?? bestSet.reps!,
      equipmentByName.get(log.exerciseName),
    );

    // Bodyweight equivalent of fallbackWeight: the lowest rep count they
    // actually completed across every logged set — a rep target already
    // proven sustainable for a full set, not just their best one.
    const fallbackReps = Math.max(
      1,
      Math.min(...validSets.map((set) => set.reps!)),
    );

    performanceByName[log.exerciseName] = {
      weight: bestSet.weight!,
      reps: bestSet.reps!,
      estimated1RM: sessionEstimated1RM,
      didMeetTarget,
      isNearMiss,
      weightClassification,
      provenWeightFloor: null, // filled in below once every log has been scanned
      fallbackWeight,
      // What was actually recommended for that session, if anything — lets
      // the prompt state an explicit "recommended X, achieved Y" comparison
      // instead of just the raw performance numbers.
      recommendedWeightAtTime: prescription?.recommendedWeight ?? null,
      equipment: equipmentByName.get(log.exerciseName) ?? null,
      prescribedSets: prescription?.sets ?? null,
      prescribedReps: prescription?.reps ?? null,
      achievedSets: validSets.length,
      fallbackReps,
    };
  }

  for (const name of Object.keys(performanceByName)) {
    performanceByName[name].provenWeightFloor =
      provenWeightFloorByName[name] ?? null;
  }

  return performanceByName;
};

export const createProgram = async (input: CreateProgramInput) => {
  validateTrainingSplit(input.trainingSplit);
  validateFitnessLevel(input.fitnessLevel);
  validateEquipmentAccess(input.equipmentAccess);
  validateTrainingGoal(input.trainingGoal);

  const { startDate, endDate } = await validateProgramDates({
    userId: input.userId,
    startDate: input.startDate,
    durationDays: input.durationDays,
    preferredDays: input.preferredDays,
  });

  const name = buildDefaultProgramName({
    durationDays: input.durationDays,
    trainingSplit: input.trainingSplit,
  });

  const program = await prisma.program.create({
    data: {
      userId: input.userId,
      name,
      description: input.description,
      startDate,
      endDate,
      durationDays: input.durationDays,
      daysPerWeek: input.daysPerWeek,
      preferredDays: input.preferredDays,
      trainingSplit: input.trainingSplit,
      sessionMinutes: input.sessionMinutes,
      fitnessLevel: input.fitnessLevel,
      equipmentAccess: input.equipmentAccess,
      trainingGoal: input.trainingGoal,
      generationStatus: "pending",
    },
  });

  generateProgramWeeks(program.id, {
    userId: input.userId,
    startDate,
    durationDays: input.durationDays,
    preferredDays: input.preferredDays,
    trainingSplit: input.trainingSplit,
    sessionMinutes: input.sessionMinutes,
    fitnessLevel: input.fitnessLevel,
    equipmentAccess: input.equipmentAccess,
    trainingGoal: input.trainingGoal,
  }).catch((err) => {
    console.error(`Program generation failed for ${program.id}:`, err);
  });

  return program;
};

export const getProgramsForUser = async (userId: string) => {
  return prisma.program.findMany({
    where: { userId },
    orderBy: { startDate: "desc" },
  });
};

// Used by the AI chat tool (get_active_program) — a compact summary rather
// than the full week/day/exercise tree getProgramById returns, since the
// model rarely needs the whole multi-week plan just to answer a question.
export const getActiveProgramForUser = async (userId: string) => {
  return prisma.program.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      daysPerWeek: true,
      trainingSplit: true,
      sessionMinutes: true,
      equipmentAccess: true,
      trainingGoal: true,
      fitnessLevel: true,
    },
  });
};

export const getProgramById = async (userId: string, programId: string) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
    include: {
      weeks: {
        include: { days: { include: { exercises: true } } },
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  return program;
};

// Powers the public profile screen — shows what a leaderboard-visible
// user is currently training, not just what they've logged. Returns null
// (not a 404) when they simply have no active program, since that's a
// normal state the profile screen falls back to workout history for.
export const getPublicActiveProgram = async (targetUserId: string) => {
  const user = await prisma.user.findFirst({
    // Same eligibility gate as getPublicProfile/getPublicWorkoutHistory —
    // appearing on the leaderboard is what makes any of this visible.
    where: {
      id: targetUserId,
      isLeaderboardVisible: true,
      username: { not: null },
    },
    select: { id: true },
  });

  if (!user) {
    throw new AppError(404, "Profile not found");
  }

  return prisma.program.findFirst({
    where: { userId: targetUserId, isActive: true },
    include: {
      weeks: {
        include: { days: { include: { exercises: true } } },
        orderBy: { weekNumber: "asc" },
      },
    },
  });
};

export const deactivateProgram = async (userId: string, programId: string) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  return prisma.program.update({
    where: { id: programId },
    data: { isActive: false },
  });
};

export const deleteProgram = async (userId: string, programId: string) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  await prisma.$transaction(async (tx) => {
    const affectedLogs = await tx.exerciseLog.findMany({
      where: { programExercise: { day: { week: { programId } } } },
      select: { workoutLogId: true },
    });

    const workoutLogIds = [
      ...new Set(affectedLogs.map((log) => log.workoutLogId)),
    ];

    await tx.exerciseLog.deleteMany({
      where: { programExercise: { day: { week: { programId } } } },
    });

    for (const workoutLogId of workoutLogIds) {
      const remaining = await tx.exerciseLog.count({
        where: { workoutLogId },
      });

      if (remaining === 0) {
        await tx.workoutLog.delete({ where: { id: workoutLogId } });
      }
    }

    await tx.program.delete({ where: { id: programId } });
  });
};

export const getScheduleForUser = async (userId: string) => {
  const programs = await prisma.program.findMany({
    where: { userId, isActive: true },
    include: {
      weeks: {
        include: {
          days: {
            include: {
              exercises: {
                include: { _count: { select: { exerciseLogs: true } } },
              },
            },
          },
        },
      },
    },
  });

  const scheduleMap = new Map<
    string,
    Array<{
      id: string;
      programId: string;
      programName: string;
      dayNumber: number;
      title: string;
      completedCount: number;
      totalCount: number;
    }>
  >();

  for (const program of programs) {
    for (const week of program.weeks) {
      for (const day of week.days) {
        if (day.isRestDay) continue;

        const dateKey = day.date.toISOString().split("T")[0];

        const completedCount = day.exercises.filter(
          (exercise) => exercise._count.exerciseLogs > 0,
        ).length;
        const totalCount = day.exercises.length;

        const entry = {
          id: day.id,
          programId: program.id,
          programName: program.name,
          dayNumber: day.dayNumber,
          title: day.focus,
          completedCount,
          totalCount,
        };

        if (!scheduleMap.has(dateKey)) {
          scheduleMap.set(dateKey, []);
        }
        scheduleMap.get(dateKey)!.push(entry);
      }
    }
  }

  // Standalone (non-program) workout logs — used to flag dates that have no
  // scheduled program day but where the user still logged something.
  const standaloneLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      exercises: { some: {}, every: { programExerciseId: null } },
    },
    select: { loggedAt: true },
  });

  const standaloneDateKeys = new Set(
    standaloneLogs.map((log) => log.loggedAt.toISOString().split("T")[0]),
  );

  for (const dateKey of standaloneDateKeys) {
    if (!scheduleMap.has(dateKey)) {
      scheduleMap.set(dateKey, []);
    }
  }

  return Array.from(scheduleMap.entries())
    .map(([date, programDays]) => ({
      date,
      programDays,
      hasStandaloneLog:
        programDays.length === 0 && standaloneDateKeys.has(date),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getProgramDayByDate = async (
  userId: string,
  programId: string,
  dateStr: string,
) => {
  const program = await prisma.program.findFirst({
    where: { id: programId, userId },
  });

  if (!program) {
    throw new AppError(404, "Program not found");
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);

  if (isNaN(targetDate.getTime())) {
    throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const programDay = await prisma.programDay.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      week: { programId },
    },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: {
          exerciseLogs: {
            include: { sets: true },
          },
        },
      },
      week: { select: { weekNumber: true } },
    },
  });

  if (!programDay) {
    throw new AppError(404, "No workout day found for that date");
  }

  // Exercises generated before any history existed for them were stored
  // with recommendedWeight: null — backfill a recommendation now from
  // whatever the user has logged since, so it doesn't stay missing forever.
  // Bodyweight exercises always have recommendedWeight: null (weight never
  // applies to them), so this filter also naturally captures every
  // bodyweight exercise — used below to live-recompute their reps/sets
  // instead, since those fields (unlike recommendedWeight) are never null
  // and so need a different signal to know when to react to new history.
  const namesMissingRecommendation = [
    ...new Set(
      programDay.exercises
        .filter((exercise) => exercise.recommendedWeight == null)
        .map((exercise) => exercise.exerciseName),
    ),
  ];

  if (namesMissingRecommendation.length > 0) {
    const [performanceHistory, catalogEntries] = await Promise.all([
      getRecentPerformanceByExerciseName(
        userId,
        namesMissingRecommendation,
        programDay.exercises.map((exercise) => exercise.id),
        programDay.date,
      ),
      prisma.exercise.findMany({
        where: { name: { in: namesMissingRecommendation } },
        select: { name: true, equipment: true },
      }),
    ]);
    const equipmentByName = new Map(
      catalogEntries.map((entry) => [entry.name, entry.equipment]),
    );

    programDay.exercises = programDay.exercises.map((exercise) => {
      const performance = performanceHistory[exercise.exerciseName];
      if (!performance) return exercise;

      const equipment = equipmentByName.get(exercise.exerciseName);

      if (equipment === "bodyweight") {
        // reps/sets are never null the way recommendedWeight is, so this
        // recomputes live on every view instead of only backfilling a
        // missing value — otherwise a bodyweight exercise's prescription
        // would stay frozen forever at whatever the AI guessed during
        // bulk generation, before any real performance existed to react to.
        //
        // Progression is based on what they actually achieved (performance.reps,
        // their best completed set) rather than prescribedReps (the value
        // frozen on the DB row at generation time, which this same live
        // recompute never writes back) — otherwise every future occurrence
        // would re-derive the same single bump from that same stale
        // baseline instead of compounding session over session, exactly
        // like the weighted case progresses from estimated1RM (derived
        // from actual lifts) rather than from the frozen prescription.
        const { sets, reps } = calculateBodyweightProgression(
          Math.max(performance.prescribedSets ?? exercise.sets, performance.achievedSets),
          performance.reps,
          performance.didMeetTarget,
          performance.isNearMiss,
          performance.fallbackReps,
        );
        return { ...exercise, sets, reps };
      }

      if (exercise.recommendedWeight != null) return exercise;

      // Four-tier response instead of a binary met/not-met check: only a
      // full success progresses the weight. A near miss or moderate miss
      // (every set attempted, shortfall small or isolated) holds the same
      // weight for another attempt — that's normal variance, not evidence
      // of overreach. Only a significant miss (skipped set, reduced
      // weight, or a real collapse) triggers the scaled-down fallback.
      const heldWeight = performance.recommendedWeightAtTime ?? performance.weight;
      let recommendedWeight: number;
      switch (performance.weightClassification) {
        case "full_success":
          recommendedWeight = estimateRecommendedWeight(
            performance.estimated1RM,
            exercise.reps,
            equipment,
          );
          break;
        case "partial_success":
          recommendedWeight = estimatePartialSuccessWeight(
            performance.estimated1RM,
            exercise.reps,
            equipment,
          );
          break;
        case "near_miss":
        case "moderate_miss":
          recommendedWeight = heldWeight;
          break;
        default:
          recommendedWeight = performance.fallbackWeight;
      }

      // Hard floor: never recommend below a weight this exercise has
      // already fully succeeded at in some past session — unless the
      // significant miss happened at that exact floor weight, which is
      // real evidence the floor itself no longer holds.
      const floor = performance.provenWeightFloor;
      if (floor != null && recommendedWeight < floor && heldWeight > floor) {
        recommendedWeight = floor;
      }

      return { ...exercise, recommendedWeight };
    });
  }

  // Attach each exercise's catalog image and equipment type so the frontend
  // can render it — and know to hide the weight input entirely for
  // bodyweight exercises — without a separate request.
  const allExerciseNames = [
    ...new Set(programDay.exercises.map((exercise) => exercise.exerciseName)),
  ];
  const imageCatalogEntries = await prisma.exercise.findMany({
    where: { name: { in: allExerciseNames } },
    select: { name: true, imageUrl: true, equipment: true },
  });
  const imageUrlByName = new Map(
    imageCatalogEntries.map((entry) => [entry.name, entry.imageUrl]),
  );
  const equipmentByExerciseName = new Map(
    imageCatalogEntries.map((entry) => [entry.name, entry.equipment]),
  );

  programDay.exercises = programDay.exercises.map((exercise) => ({
    ...exercise,
    imageUrl: toProxiedImagePath(
      exercise.exerciseName,
      imageUrlByName.get(exercise.exerciseName) != null,
    ),
    equipment: equipmentByExerciseName.get(exercise.exerciseName) ?? null,
  }));

  return programDay;
};

export const logExercisePerformance = async (
  userId: string,
  programExerciseId: string,
  sets: Array<{ weight: number | null; reps: number }>,
  durationSecs?: number,
) => {
  const programExercise = await prisma.programExercise.findFirst({
    where: {
      id: programExerciseId,
      day: { week: { program: { userId } } },
    },
    include: { day: true }, // NEW — need the day's actual date
  });

  if (!programExercise) {
    throw new AppError(404, "Exercise not found");
  }

  await assertNotFutureLog(userId, programExercise.day.date);

  if (sets.length === 0) {
    throw new AppError(400, "At least one set is required");
  }

  const existingLog = await prisma.exerciseLog.findUnique({
    where: { programExerciseId },
  });

  let exerciseLog;

  if (existingLog) {
    await prisma.exerciseSet.deleteMany({
      where: { exerciseLogId: existingLog.id },
    });

    exerciseLog = await prisma.exerciseLog.update({
      where: { id: existingLog.id },
      data: {
        sets: {
          create: sets.map((set, index) => ({
            setNumber: index + 1,
            weight: set.weight,
            reps: set.reps,
            durationSecs: durationSecs ?? null,
          })),
        },
      },
      include: { sets: true },
    });
  } else {
    const workoutLog = await prisma.workoutLog.create({
      data: {
        userId,
        loggedAt: programExercise.day.date, // FIXED — use the actual program day's date
      },
    });

    exerciseLog = await prisma.exerciseLog.create({
      data: {
        workoutLogId: workoutLog.id,
        programExerciseId: programExercise.id,
        exerciseName: programExercise.exerciseName,
        muscleGroup: programExercise.muscleGroup,
        sets: {
          create: sets.map((set, index) => ({
            setNumber: index + 1,
            weight: set.weight,
            reps: set.reps,
            durationSecs: durationSecs ?? null,
          })),
        },
      },
      include: { sets: true },
    });
  }

  // Only mark the exercise "completed" once the user's logged sets actually
  // meet or exceed what the AI prescribed — fewer/lighter sets than that
  // just means they're in progress, not done.
  const meetsPrescription =
    sets.length >= programExercise.sets &&
    sets.every((set) => set.reps >= programExercise.reps) &&
    (programExercise.recommendedWeight == null ||
      sets.every(
        (set) => (set.weight ?? 0) >= programExercise.recommendedWeight!,
      ));

  await prisma.programExercise.update({
    where: { id: programExercise.id },
    data: { isCompleted: meetsPrescription },
  });

  return exerciseLog;
};

export const deleteExercisePerformance = async (
  userId: string,
  programExerciseId: string,
) => {
  const programExercise = await prisma.programExercise.findFirst({
    where: {
      id: programExerciseId,
      day: { week: { program: { userId } } },
    },
  });

  if (!programExercise) {
    throw new AppError(404, "Exercise not found");
  }

  const existingLog = await prisma.exerciseLog.findFirst({
    where: { programExerciseId },
    include: { workoutLog: { include: { exercises: true } } },
  });

  if (!existingLog) {
    throw new AppError(404, "No logged performance found for this exercise");
  }

  await prisma.exerciseLog.delete({ where: { id: existingLog.id } });

  const remainingExercises = existingLog.workoutLog.exercises.length - 1;
  if (remainingExercises === 0) {
    await prisma.workoutLog.delete({
      where: { id: existingLog.workoutLog.id },
    });
  }

  await prisma.programExercise.update({
    where: { id: programExercise.id },
    data: { isCompleted: false },
  });
};

export const deleteProgramExercise = async (
  userId: string,
  programExerciseId: string,
) => {
  const programExercise = await prisma.programExercise.findFirst({
    where: {
      id: programExerciseId,
      day: { week: { program: { userId } } },
    },
  });

  if (!programExercise) {
    throw new AppError(404, "Exercise not found");
  }

  // Any ExerciseLog tied to this exact exercise has its programExerciseId
  // set null (onDelete: SetNull, schema.prisma) rather than being deleted —
  // it keeps its own exerciseName/muscleGroup snapshot, so history logged
  // under it stays intact even though the prescribed slot is gone.
  await prisma.programExercise.delete({ where: { id: programExerciseId } });
};

export const swapProgramExercise = async (
  userId: string,
  programExerciseId: string,
  newExerciseId: string,
) => {
  const programExercise = await prisma.programExercise.findFirst({
    where: {
      id: programExerciseId,
      day: { week: { program: { userId } } },
    },
  });

  if (!programExercise) {
    throw new AppError(404, "Exercise not found");
  }

  const newExercise = await prisma.exercise.findUnique({
    where: { id: newExerciseId },
  });

  if (!newExercise) {
    throw new AppError(404, "Exercise not found in catalog");
  }

  return prisma.programExercise.update({
    where: { id: programExerciseId },
    data: {
      exerciseName: newExercise.name,
      muscleGroup: newExercise.muscleGroup,
      // Reset so getProgramDayByDate's existing recommendation backfill
      // re-derives it from history under the new exercise name, rather
      // than keeping a weight that was recommended for a different lift.
      recommendedWeight: null,
      isCompleted: false,
      // Only snapshot on the *first* swap — a second swap must still be
      // revertible back to what was originally prescribed, not to the
      // exercise it was most recently swapped from.
      ...(programExercise.originalExerciseName == null
        ? {
            originalExerciseName: programExercise.exerciseName,
            originalMuscleGroup: programExercise.muscleGroup,
          }
        : {}),
    },
  });
};

export const revertDaySwaps = async (userId: string, dayId: string) => {
  const day = await prisma.programDay.findFirst({
    where: { id: dayId, week: { program: { userId } } },
    include: { exercises: true },
  });

  if (!day) {
    throw new AppError(404, "Day not found");
  }

  const swappedExercises = day.exercises.filter(
    (exercise) => exercise.originalExerciseName != null,
  );

  if (swappedExercises.length === 0) {
    throw new AppError(400, "No swapped exercises to revert on this day");
  }

  await prisma.$transaction(
    swappedExercises.map((exercise) =>
      prisma.programExercise.update({
        where: { id: exercise.id },
        data: {
          exerciseName: exercise.originalExerciseName!,
          muscleGroup: exercise.originalMuscleGroup!,
          originalExerciseName: null,
          originalMuscleGroup: null,
          recommendedWeight: null,
          isCompleted: false,
        },
      }),
    ),
  );
};

const addOneDay = (date: Date): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  return result;
};

export const postponeProgramDay = async (userId: string, dayId: string) => {
  const day = await prisma.programDay.findFirst({
    where: { id: dayId, week: { program: { userId } } },
    include: {
      exercises: { include: { _count: { select: { exerciseLogs: true } } } },
      week: { include: { program: true } },
    },
  });

  if (!day) {
    throw new AppError(404, "Day not found");
  }
  if (day.isRestDay) {
    throw new AppError(400, "Rest days can't be postponed");
  }

  const hasLoggedProgress = day.exercises.some(
    (exercise) => exercise._count.exerciseLogs > 0,
  );
  if (hasLoggedProgress) {
    throw new AppError(
      400,
      "This day already has logged progress and can't be postponed",
    );
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (day.date >= todayStart) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email !== UNRESTRICTED_TEST_EMAIL) {
      throw new AppError(400, "Only a missed day can be postponed");
    }
  }

  const programId = day.week.program.id;

  // Shifts this day and every later day in the program forward by one —
  // not just this single day — so the whole remaining schedule slides in
  // step, keeping every day's date unique and preserving the program's
  // rest-day cadence and day-to-day spacing.
  const laterDays = await prisma.programDay.findMany({
    where: { date: { gte: day.date }, week: { programId } },
    select: { id: true, date: true },
  });

  await prisma.$transaction([
    ...laterDays.map((d) => {
      const newDate = addOneDay(d.date);
      return prisma.programDay.update({
        where: { id: d.id },
        data: { date: newDate, dayName: REAL_DAY_NAMES[newDate.getDay()] },
      });
    }),
    prisma.program.update({
      where: { id: programId },
      data: { endDate: addOneDay(day.week.program.endDate) },
    }),
  ]);

  return { postponedCount: laterDays.length };
};

// Same region-collapsing used for AI program generation (bro split's
// "back, lats, traps" is one trained region, not three) — reused here so
// a conflict check judges "same muscle group" the same way the generator
// itself does, rather than a second, possibly-inconsistent definition.
const getDayRegionsFromExercises = (
  exercises: { muscleGroup: string }[],
): string[] => getDayRegions(exercises.map((exercise) => exercise.muscleGroup));

// Lets a viewer take a single day from someone else's public program (as
// seen on the profile screen reached from the leaderboard) and drop it
// into their OWN active program — replacing whatever was scheduled there,
// not adding a second program. A program's split repeats every week (e.g.
// "Wednesday = Back" for the whole program duration), so "my Wednesday"
// isn't just this week's Wednesday — this replaces EVERY occurrence of
// the source's day-of-week across the viewer's whole active program, not
// only the one in the current week. Only the exercise prescription copies
// over (name/sets/reps/rest/notes); no recommendedWeight or logs, since
// those are specific to the other person's own performance history, not
// the viewer's.
//
// `force` skips the adjacent-day muscle-group conflict check below — the
// frontend calls once without it, and if that 409s with a conflict
// warning (e.g. "you also train Chest on Wednesday"), re-calls with
// force: true only if the user explicitly confirms anyway.
export const inheritWorkoutDay = async (
  viewerId: string,
  sourceDayId: string,
  force: boolean = false,
) => {
  const sourceDay = await prisma.programDay.findFirst({
    where: {
      id: sourceDayId,
      // Same eligibility gate as getPublicActiveProgram — only a day from
      // a leaderboard-visible user's program can be copied, mirroring
      // what the profile screen was even allowed to show in the first
      // place.
      week: {
        program: {
          user: { isLeaderboardVisible: true, username: { not: null } },
        },
      },
    },
    include: {
      exercises: { orderBy: { order: "asc" } },
    },
  });

  if (!sourceDay) {
    throw new AppError(404, "Workout day not found");
  }
  if (sourceDay.isRestDay) {
    throw new AppError(400, "Can't inherit a rest day");
  }

  // Every day in the viewer's own active program sharing the source's
  // day-of-week — not scoped to "this week", since the same weekday
  // recurs for the program's whole duration and all of them should stay
  // consistent with each other.
  const targetDays = await prisma.programDay.findMany({
    where: {
      dayName: sourceDay.dayName,
      week: { program: { userId: viewerId, isActive: true } },
    },
    include: { week: { select: { weekNumber: true } } },
    orderBy: { date: "asc" },
  });

  if (targetDays.length === 0) {
    throw new AppError(
      400,
      `Your program doesn't have a ${sourceDay.dayName}`,
    );
  }

  if (!force) {
    // Warn (don't silently block) if this would train the same muscle
    // region as the viewer's own day before or after, in ANY week it
    // recurs — e.g. copying in a Chest day next to a Chest day they
    // already have, back-to-back with no recovery, even if that only
    // happens in week 3 because week 1's neighbor was postponed and no
    // longer lines up the same way. Compares by REGION (chest/back/
    // shoulders/arms/legs/core), not raw exercise names, so "Incline
    // Bench" the day before and "Flat Bench" here still counts.
    const oneDayMs = 24 * 60 * 60 * 1000;
    const adjacentRanges = targetDays.flatMap((day) => {
      const dayBeforeStart = new Date(day.date.getTime() - oneDayMs);
      dayBeforeStart.setHours(0, 0, 0, 0);
      const dayBeforeEnd = new Date(dayBeforeStart);
      dayBeforeEnd.setHours(23, 59, 59, 999);
      const dayAfterStart = new Date(day.date.getTime() + oneDayMs);
      dayAfterStart.setHours(0, 0, 0, 0);
      const dayAfterEnd = new Date(dayAfterStart);
      dayAfterEnd.setHours(23, 59, 59, 999);
      return [
        { gte: dayBeforeStart, lte: dayBeforeEnd },
        { gte: dayAfterStart, lte: dayAfterEnd },
      ];
    });

    const adjacentDays = await prisma.programDay.findMany({
      where: {
        week: { program: { userId: viewerId, isActive: true } },
        OR: adjacentRanges.map((range) => ({ date: range })),
      },
      include: { exercises: true, week: { select: { weekNumber: true } } },
    });

    const sourceRegions = new Set(getDayRegionsFromExercises(sourceDay.exercises));
    const conflicts = adjacentDays
      .filter((day) => !day.isRestDay && day.exercises.length > 0)
      .map((day) => {
        const overlap = getDayRegionsFromExercises(day.exercises).filter(
          (region) => sourceRegions.has(region),
        );
        return overlap.length > 0
          ? `Week ${day.week.weekNumber} ${day.dayName} (${overlap.join(", ")})`
          : null;
      })
      .filter((conflict): conflict is string => conflict !== null);

    if (conflicts.length > 0) {
      // Capped so a long program with a genuinely conflicting split
      // doesn't produce an unreadable wall of text — the point is to
      // show it's a real, recurring conflict, not enumerate every week.
      const shown = conflicts.slice(0, 3);
      const suffix =
        conflicts.length > shown.length
          ? ` and ${conflicts.length - shown.length} more`
          : "";
      throw new AppError(
        409,
        `This overlaps with what you already have scheduled on ${shown.join(", ")}${suffix}.`,
      );
    }
  }

  const targetDayIds = targetDays.map((day) => day.id);

  await prisma.$transaction([
    prisma.programExercise.deleteMany({
      where: { dayId: { in: targetDayIds } },
    }),
    ...targetDays.map((day) =>
      prisma.programDay.update({
        where: { id: day.id },
        data: {
          isRestDay: false,
          focus: sourceDay.focus,
          exercises: {
            create: sourceDay.exercises.map((exercise, index) => ({
              exerciseName: exercise.exerciseName,
              muscleGroup: exercise.muscleGroup,
              sets: exercise.sets,
              reps: exercise.reps,
              restSeconds: exercise.restSeconds,
              notes: exercise.notes,
              order: index + 1,
            })),
          },
        },
      }),
    ),
  ]);

  return { dayIds: targetDayIds, updatedCount: targetDayIds.length };
};

export const addProgramExercise = async (
  userId: string,
  dayId: string,
  input: {
    exerciseId: string;
    sets: number;
    reps: number;
    restSeconds: number;
    notes?: string;
  },
) => {
  const day = await prisma.programDay.findFirst({
    where: { id: dayId, week: { program: { userId } } },
    include: { exercises: true },
  });

  if (!day) {
    throw new AppError(404, "Day not found");
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: input.exerciseId },
  });

  if (!exercise) {
    throw new AppError(404, "Exercise not found in catalog");
  }

  if (day.isRestDay) {
    await prisma.programDay.update({
      where: { id: dayId },
      data: { isRestDay: false },
    });
  }

  const nextOrder =
    Math.max(0, ...day.exercises.map((existing) => existing.order)) + 1;

  return prisma.programExercise.create({
    data: {
      dayId,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      sets: input.sets,
      reps: input.reps,
      restSeconds: input.restSeconds,
      notes: input.notes ?? null,
      order: nextOrder,
      recommendedWeight: null,
    },
  });
};

const stripCodeFences = (text: string): string => {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
};

const normalizeExerciseNameWords = (name: string): string[] =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

// Treats simple singular/plural variants as equal (e.g. "raise" / "raises")
// without breaking words that already end in "s" (e.g. "press").
const wordsMatch = (a: string, b: string): boolean =>
  a === b ||
  `${a}s` === b ||
  `${b}s` === a ||
  `${a}es` === b ||
  `${b}es` === a;

// The AI is instructed to only use exact names from the allowed list, but
// occasionally drifts to a close paraphrase (e.g. "Calf Raises" instead of
// "Standing Calf Raise"). Rather than fail the entire program generation
// over one imprecise name, try to resolve it to the closest allowed
// exercise whose words are a superset of the AI's words — if there's
// exactly one unambiguous candidate, use it.
const resolveExerciseName = (
  rawName: string,
  allowedExercises: string[],
): string | null => {
  if (allowedExercises.includes(rawName)) return rawName;

  const lowerRaw = rawName.toLowerCase();
  const caseInsensitiveMatch = allowedExercises.find(
    (name) => name.toLowerCase() === lowerRaw,
  );
  if (caseInsensitiveMatch) return caseInsensitiveMatch;

  const rawWords = normalizeExerciseNameWords(rawName);
  const candidates = allowedExercises.filter((name) => {
    const nameWords = normalizeExerciseNameWords(name);
    return rawWords.every((word) =>
      nameWords.some((nameWord) => wordsMatch(word, nameWord)),
    );
  });

  return candidates[0] ?? null;
};

// Runs `fn` over `items` with at most `limit` calls in flight at once,
// via a small worker pool pulling from a shared cursor — avoids adding a
// dependency (e.g. p-limit) for what's a ~10-line pattern.
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

// How many week-generation OpenAI calls run concurrently. Weeks are
// independent (same allowed-exercise list and split assignment, and
// performance history comes from the user's real past logs, not from
// other weeks in this run), so this is purely a rate-limit safety cap,
// not a correctness constraint — raise it if account rate limits allow.
const WEEK_GENERATION_CONCURRENCY = 3;

const generateProgramWeeks = async (
  programId: string,
  input: {
    userId: string;
    startDate: Date;
    durationDays: number;
    preferredDays: string[];
    trainingSplit: TrainingSplit;
    sessionMinutes: number;
    fitnessLevel: FitnessLevel;
    equipmentAccess: EquipmentAccess;
    trainingGoal: TrainingGoal;
  },
) => {
  const plan = getWeeksPlan(
    input.startDate,
    input.durationDays,
    input.preferredDays,
  );
  const totalWeeks = plan.length;
  const totalSessions = plan.reduce(
    (sum, week) => sum + week.trainingDays.length,
    0,
  );

  const normalizedTrainingDays = [
    ...new Set(input.preferredDays.map(normalizeDay)),
  ];
  const daySplitAssignment = assignSplitToDays(
    normalizedTrainingDays,
    SPLIT_TEMPLATES[input.trainingSplit],
  );

  const allowedExercises = await getAllowedExerciseNames(
    input.trainingSplit,
    input.equipmentAccess,
  );
  const allowedExerciseSet = new Set(allowedExercises);

  await prisma.program.update({
    where: { id: programId },
    data: {
      generationStatus: "generating",
      generationStep: "Analyzing your training profile...",
      generationStepIndex: 0,
      totalSessions,
      generatedSessions: 0,
    },
  });

  try {
    // Doesn't depend on the week being built — the same real logged
    // history applies to every week in this run, so it's fetched once
    // instead of once per week.
    const performanceHistory = await getRecentPerformanceByExerciseName(
      input.userId,
      allowedExercises,
    );

    let completedWeeks = 0;
    let generatedSessions = 0;

    // Weeks are generated concurrently (see WEEK_GENERATION_CONCURRENCY) —
    // progress is reported as a completed count rather than "week N",
    // since weeks no longer necessarily finish in numeric order.
    await mapWithConcurrency(plan, WEEK_GENERATION_CONCURRENCY, async (week) => {
      const prompt = buildWeekPrompt({
        weekNumber: week.weekNumber,
        totalWeeks,
        days: week.days,
        daySplitAssignment,
        sessionMinutes: input.sessionMinutes,
        fitnessLevel: input.fitnessLevel,
        trainingGoal: input.trainingGoal,
        allowedExercises,
        performanceHistory,
      });

      // gpt-4o-mini was unreliable at following this prompt's per-day exact
      // exercise-count and movement-category requirements (e.g. generating
      // only 2 exercises for a dedicated bro-split day instead of the
      // stated target) — this call happens once per program, not per
      // chat message, so the accuracy gap is worth the extra cost of the
      // full model.
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) {
        throw new Error(
          `No content returned from OpenAI for week ${week.weekNumber}`,
        );
      }

      const parsed = JSON.parse(stripCodeFences(rawContent));
      const validated = weekResponseSchema.parse(parsed);

      for (const day of validated.days) {
        day.exercises = day.exercises.flatMap((exercise) => {
          let resolvedName: string | null = exercise.exerciseName;

          if (!allowedExerciseSet.has(exercise.exerciseName)) {
            resolvedName = resolveExerciseName(
              exercise.exerciseName,
              allowedExercises,
            );

            if (!resolvedName) {
              console.warn(
                `Dropping AI-generated exercise not in allowed list (no close match found): "${exercise.exerciseName}"`,
              );
              return [];
            }

            console.warn(
              `Resolved AI-generated exercise "${exercise.exerciseName}" to allowed exercise "${resolvedName}"`,
            );
          }

          // Structural safety net: strip any recommendedWeight the AI
          // attached to an exercise with no real prior logged history for
          // that exact name, regardless of what the prompt asked for —
          // this must be enforced in code, not just requested of the AI.
          if (
            exercise.recommendedWeight != null &&
            !performanceHistory[resolvedName]
          ) {
            console.warn(
              `Stripping unjustified recommendedWeight for "${resolvedName}" — no prior logged history for this exact exercise name.`,
            );
            return [
              { ...exercise, exerciseName: resolvedName, recommendedWeight: undefined },
            ];
          }

          return [{ ...exercise, exerciseName: resolvedName }];
        });

        // Post-generation compliance check — the prompt states an exact
        // per-day target, but nothing stops the model from ignoring it.
        // This can't fully repair a short day (no code path here safely
        // invents new exercises), but it makes under-generation visible in
        // logs instead of silently shipping a thin day, which is how the
        // original bug (a bro-split day with only 2 exercises) went
        // unnoticed until a user reported it.
        if (!day.isRestDay) {
          const focus = daySplitAssignment[day.dayName] ?? [];
          const { totalExercises: target } = getDayVolumeTarget(
            focus,
            input.fitnessLevel,
          );
          if (day.exercises.length < target) {
            console.warn(
              `Program generation under target: week ${week.weekNumber} ${day.dayName} (${focus.join("/")}) has ${day.exercises.length} exercises, target was ${target}.`,
            );
          }
        }
      }

      await prisma.programWeek.create({
        data: {
          programId,
          weekNumber: week.weekNumber,
          days: {
            create: validated.days.map((day, index) => ({
              dayNumber: index + 1,
              dayName: day.dayName,
              date: week.days[index]?.date ?? week.days[0].date,
              focus: day.focus,
              isRestDay: day.isRestDay,
              exercises: {
                // "order" is derived from final array position, not taken
                // from the AI's output — it's not always present, and even
                // when it is, dropped exercises (unresolvable names) would
                // leave gaps in it. Array position is always contiguous and
                // always reflects what's actually being persisted.
                create: day.exercises.map((exercise, exerciseIndex) => ({
                  exerciseName: exercise.exerciseName,
                  muscleGroup: exercise.muscleGroup,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restSeconds: exercise.restSeconds,
                  notes: exercise.notes,
                  order: exerciseIndex + 1,
                  recommendedWeight: exercise.recommendedWeight ?? null,
                })),
              },
            })),
          },
        },
      });

      completedWeeks += 1;
      generatedSessions += week.trainingDays.length;

      await prisma.program.update({
        where: { id: programId },
        data: {
          generationStep: `Building your program... (${completedWeeks} of ${totalWeeks} weeks ready)`,
          generationStepIndex: completedWeeks,
          generatedSessions,
        },
      });
    });

    await prisma.program.update({
      where: { id: programId },
      data: {
        generationStatus: "completed",
        generationStep: "Finalizing your program...",
        generationStepIndex: totalWeeks + 1,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("generateProgramWeeks failed:", err); //
    await prisma.program.update({
      where: { id: programId },
      data: {
        generationStatus: "failed",
        generationError: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
};
