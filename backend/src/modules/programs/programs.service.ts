import prisma from "../../lib/prisma";
import openai from "../../lib/openai";
import AppError from "../../utils/AppError";
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
  getWeeksPlan,
  buildWeekPrompt,
  assignSplitToDays,
  normalizeDay,
  getWeightIncrement,
  roundToNearestIncrement,
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

  for (const log of logs) {
    if (performanceByName[log.exerciseName]) continue; // already have the most recent session

    const validSets = log.sets.filter(
      (set) => set.weight != null && set.reps != null,
    );
    if (validSets.length === 0) continue;

    const bestSet = validSets.reduce((best, set) =>
      estimate1RM(set.weight!, set.reps!) >
      estimate1RM(best.weight!, best.reps!)
        ? set
        : best,
    );

    // Every prescribed set must be met — not just some, not an average.
    // Standalone logs (no linked programExercise) have nothing prescribed
    // to fall short of, so they're treated as met by default.
    const prescription = log.programExercise;
    const didMeetTarget = prescription
      ? validSets.length >= prescription.sets &&
        validSets.every(
          (set) =>
            set.reps! >= prescription.reps &&
            (prescription.recommendedWeight == null ||
              set.weight! >= prescription.recommendedWeight),
        )
      : true;

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

    performanceByName[log.exerciseName] = {
      weight: bestSet.weight!,
      reps: bestSet.reps!,
      estimated1RM: sessionEstimated1RM,
      didMeetTarget,
      fallbackWeight,
      // What was actually recommended for that session, if anything — lets
      // the prompt state an explicit "recommended X, achieved Y" comparison
      // instead of just the raw performance numbers.
      recommendedWeightAtTime: prescription?.recommendedWeight ?? null,
    };
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
      if (exercise.recommendedWeight != null || !performance) return exercise;

      // Only apply the upward progression estimate if they fully met their
      // last prescription — otherwise hold at what they actually
      // demonstrated, same as the AI-generation-time logic.
      return {
        ...exercise,
        recommendedWeight: performance.didMeetTarget
          ? estimateRecommendedWeight(
              performance.estimated1RM,
              exercise.reps,
              equipmentByName.get(exercise.exerciseName),
            )
          : performance.fallbackWeight,
      };
    });
  }

  // Attach each exercise's catalog image so the frontend can render it
  // without a separate request.
  const allExerciseNames = [
    ...new Set(programDay.exercises.map((exercise) => exercise.exerciseName)),
  ];
  const imageCatalogEntries = await prisma.exercise.findMany({
    where: { name: { in: allExerciseNames } },
    select: { name: true, imageUrl: true },
  });
  const imageUrlByName = new Map(
    imageCatalogEntries.map((entry) => [entry.name, entry.imageUrl]),
  );

  programDay.exercises = programDay.exercises.map((exercise) => ({
    ...exercise,
    imageUrl: toProxiedImagePath(
      exercise.exerciseName,
      imageUrlByName.get(exercise.exerciseName) != null,
    ),
  }));

  return programDay;
};

export const logExercisePerformance = async (
  userId: string,
  programExerciseId: string,
  sets: Array<{ weight: number; reps: number }>,
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
      sets.every((set) => set.weight >= programExercise.recommendedWeight!));

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
    let generatedSessions = 0;

    for (const week of plan) {
      await prisma.program.update({
        where: { id: programId },
        data: {
          generationStep: `Building week ${week.weekNumber} of ${totalWeeks}...`,
          generationStepIndex: week.weekNumber,
        },
      });

      const performanceHistory = await getRecentPerformanceByExerciseName(
        input.userId,
        allowedExercises,
      );

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

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
                create: day.exercises.map((exercise) => ({
                  exerciseName: exercise.exerciseName,
                  muscleGroup: exercise.muscleGroup,
                  sets: exercise.sets,
                  reps: exercise.reps,
                  restSeconds: exercise.restSeconds,
                  notes: exercise.notes,
                  order: exercise.order,
                  recommendedWeight: exercise.recommendedWeight ?? null,
                })),
              },
            })),
          },
        },
      });

      generatedSessions += week.trainingDays.length;

      await prisma.program.update({
        where: { id: programId },
        data: { generatedSessions },
      });
    }

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
