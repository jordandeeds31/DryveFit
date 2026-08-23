import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import { assertNotFutureLog } from "../../utils/futureLogGuard";

// Best-effort catalog match for a name typed in natural language (via the
// AI chat tool below) rather than picked from DropdownExerciseSelect's
// exact list — tries an exact case-insensitive match first, then falls
// back to a "contains" search. Multiple contains-matches throws instead of
// guessing, since silently picking the wrong exercise (e.g. "press" for a
// user who logs both Barbell Bench Press and Overhead Press) is worse than
// asking the model to ask the user which one they meant.
const findCatalogExercise = async (exerciseName: string) => {
  const exact = await prisma.exercise.findFirst({
    where: { name: { equals: exerciseName, mode: "insensitive" } },
  });
  if (exact) return exact;

  const candidates = await prisma.exercise.findMany({
    where: { name: { contains: exerciseName, mode: "insensitive" } },
    take: 5,
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    throw new AppError(
      409,
      `Multiple exercises match "${exerciseName}": ${candidates
        .map((c) => c.name)
        .join(", ")}. Ask the user which one they meant.`,
    );
  }
  return null;
};

export const logStandaloneWorkout = async (
  userId: string,
  exercises: Array<{
    exerciseName: string;
    muscleGroup: string;
    sets: Array<{ weight: number | null; reps: number }>;
  }>,
  dateStr: string,
) => {
  if (exercises.length === 0) {
    throw new AppError(400, "At least one exercise is required");
  }

  for (const exercise of exercises) {
    if (exercise.sets.length === 0) {
      throw new AppError(
        400,
        `${exercise.exerciseName} needs at least one set`,
      );
    }
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  const loggedAt = new Date(year, month - 1, day);

  await assertNotFutureLog(userId, loggedAt);

  // Remove any existing standalone logs for this date — this call fully
  // replaces them with whatever's currently in the form.
  await prisma.workoutLog.deleteMany({
    where: {
      userId,
      loggedAt: { gte: startOfDay, lte: endOfDay },
      exercises: {
        every: { programExerciseId: null },
      },
    },
  });

  const workoutLog = await prisma.workoutLog.create({
    data: {
      userId,
      loggedAt,
      exercises: {
        create: exercises.map((exercise) => ({
          exerciseName: exercise.exerciseName,
          muscleGroup: exercise.muscleGroup,
          sets: {
            create: exercise.sets.map((set, index) => ({
              setNumber: index + 1,
              weight: set.weight,
              reps: set.reps,
            })),
          },
        })),
      },
    },
    include: {
      exercises: { include: { sets: true } },
    },
  });

  return workoutLog;
};

// Used by the AI chat tool (log_workout_sets) — deliberately additive,
// unlike logStandaloneWorkout above which replaces the whole day's log
// wholesale. A chat message like "log 3 sets of bench press" should only
// ever add to whatever's already logged for that date (e.g. squats logged
// earlier), never silently wipe it out to leave just the one exercise.
export const logExerciseSetsForDate = async (
  userId: string,
  exerciseName: string,
  sets: Array<{ weight: number | null; reps: number }>,
  dateStr: string,
) => {
  if (sets.length === 0) {
    throw new AppError(400, "At least one set is required");
  }

  const catalogEntry = await findCatalogExercise(exerciseName);
  if (!catalogEntry) {
    throw new AppError(
      404,
      `No exercise in the catalog matches "${exerciseName}".`,
    );
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  const loggedAt = new Date(year, month - 1, day);

  await assertNotFutureLog(userId, loggedAt);

  const workoutLog =
    (await prisma.workoutLog.findFirst({
      where: {
        userId,
        loggedAt: { gte: startOfDay, lte: endOfDay },
        exercises: { every: { programExerciseId: null } },
      },
      include: { exercises: { include: { sets: true } } },
    })) ??
    (await prisma.workoutLog.create({
      data: { userId, loggedAt },
      include: { exercises: { include: { sets: true } } },
    }));

  const existingExerciseLog = workoutLog.exercises.find(
    (exercise) =>
      exercise.exerciseName.toLowerCase() === catalogEntry.name.toLowerCase(),
  );

  const exerciseLog =
    existingExerciseLog ??
    (await prisma.exerciseLog.create({
      data: {
        workoutLogId: workoutLog.id,
        exerciseName: catalogEntry.name,
        muscleGroup: catalogEntry.muscleGroup,
      },
      include: { sets: true },
    }));

  const startingSetNumber = exerciseLog.sets.length;
  await prisma.exerciseSet.createMany({
    data: sets.map((set, index) => ({
      exerciseLogId: exerciseLog.id,
      setNumber: startingSetNumber + index + 1,
      weight: set.weight,
      reps: set.reps,
    })),
  });

  return prisma.exerciseLog.findUniqueOrThrow({
    where: { id: exerciseLog.id },
    include: { sets: true },
  });
};

export const deleteWorkoutLogsForDate = async (
  userId: string,
  dateStr: string,
) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  // Only ever touches standalone logs (never a program day's logged
  // exercises) — same scoping used by logStandaloneWorkout/getWorkoutLogsForDate.
  // ExerciseLog/ExerciseSet rows cascade-delete automatically via the schema.
  await prisma.workoutLog.deleteMany({
    where: {
      userId,
      loggedAt: { gte: startOfDay, lte: endOfDay },
      exercises: {
        every: { programExerciseId: null },
      },
    },
  });
};

export const deleteWorkoutLogSet = async (
  userId: string,
  exerciseLogId: string,
  setId: string,
) => {
  const exerciseLog = await prisma.exerciseLog.findFirst({
    where: { id: exerciseLogId, workoutLog: { userId } },
    include: { sets: true, workoutLog: { include: { exercises: true } } },
  });

  if (!exerciseLog) {
    throw new AppError(404, "Exercise log not found");
  }

  const set = exerciseLog.sets.find((s) => s.id === setId);
  if (!set) {
    throw new AppError(404, "Set not found");
  }

  await prisma.exerciseSet.delete({ where: { id: setId } });

  const remainingSets = exerciseLog.sets.length - 1;
  if (remainingSets === 0) {
    await prisma.exerciseLog.delete({ where: { id: exerciseLog.id } });

    const remainingExercises = exerciseLog.workoutLog.exercises.length - 1;
    if (remainingExercises === 0) {
      await prisma.workoutLog.delete({
        where: { id: exerciseLog.workoutLog.id },
      });
    }
  }
};

export const getWorkoutLogsForDate = async (
  userId: string,
  dateStr: string,
) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      userId,
      loggedAt: { gte: startOfDay, lte: endOfDay },
      exercises: {
        every: { programExerciseId: null },
      },
    },
    include: {
      exercises: { include: { sets: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Attach each exercise's catalog equipment type so re-opening an already
  // logged bodyweight exercise still knows to hide the weight input.
  const allExerciseNames = [
    ...new Set(
      workoutLogs.flatMap((log) =>
        log.exercises.map((exercise) => exercise.exerciseName),
      ),
    ),
  ];
  const catalogEntries = await prisma.exercise.findMany({
    where: { name: { in: allExerciseNames } },
    select: { name: true, equipment: true },
  });
  const equipmentByName = new Map(
    catalogEntries.map((entry) => [entry.name, entry.equipment]),
  );

  return workoutLogs.map((log) => ({
    ...log,
    exercises: log.exercises.map((exercise) => ({
      ...exercise,
      equipment: equipmentByName.get(exercise.exerciseName) ?? null,
    })),
  }));
};

// Used by the AI chat tool (get_recent_workouts) — the owner's own full
// history, not gated by leaderboard visibility like getPublicWorkoutHistory.
export const getRecentWorkoutLogsForUser = async (
  userId: string,
  limit: number,
) => {
  const workoutLogs = await prisma.workoutLog.findMany({
    where: { userId },
    include: { exercises: { include: { sets: true } } },
    orderBy: { loggedAt: "desc" },
    take: limit,
  });

  return workoutLogs.map((log) => ({
    id: log.id,
    loggedAt: log.loggedAt,
    exercises: log.exercises.map((exercise) => ({
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
      })),
    })),
  }));
};

// Used by the AI chat tool to know what exercise names it can even ask
// get_1rm_history about, without the model having to guess/hallucinate one.
export const getDistinctExerciseNamesForUser = async (userId: string) => {
  const logs = await prisma.exerciseLog.findMany({
    where: { workoutLog: { userId } },
    distinct: ["exerciseName"],
    select: { exerciseName: true },
  });

  return logs.map((log) => log.exerciseName).sort();
};

const PUBLIC_WORKOUT_HISTORY_LIMIT = 20;

// Shown on another user's public profile (reached from the leaderboard) —
// gated by the same isLeaderboardVisible/username eligibility as
// getPublicProfile. Standalone-only (same `programExerciseId: null` filter
// as getWorkoutLogsForDate above) — the profile screen renders this
// alongside the active-program section (see getPublicActiveProgram), not
// as a replacement for it, so program-linked logs would otherwise show
// twice.
export const getPublicWorkoutHistory = async (targetUserId: string) => {
  const user = await prisma.user.findFirst({
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

  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      userId: targetUserId,
      exercises: { every: { programExerciseId: null } },
    },
    include: { exercises: { include: { sets: true } } },
    orderBy: { loggedAt: "desc" },
    take: PUBLIC_WORKOUT_HISTORY_LIMIT,
  });

  return workoutLogs.map((log) => ({
    id: log.id,
    loggedAt: log.loggedAt,
    exercises: log.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
      })),
    })),
  }));
};
