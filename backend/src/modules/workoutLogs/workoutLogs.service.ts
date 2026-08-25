import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import { assertNotFutureLog } from "../../utils/futureLogGuard";

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

  // Same equipment enrichment getWorkoutLogsForDate does — the frontend
  // writes this response straight into the ["workoutLogs", date] cache on
  // success (see useLogStandaloneWorkout) rather than waiting on a
  // separate refetch, so it needs to match that shape exactly, including
  // the field WorkoutLogger's edit-prefill uses to hide the weight input
  // for a bodyweight exercise.
  const exerciseNames = workoutLog.exercises.map((exercise) => exercise.exerciseName);
  const catalogEntries = await prisma.exercise.findMany({
    where: { name: { in: exerciseNames } },
    select: { name: true, equipment: true },
  });
  const equipmentByName = new Map(
    catalogEntries.map((entry) => [entry.name, entry.equipment]),
  );

  return {
    ...workoutLog,
    exercises: workoutLog.exercises.map((exercise) => ({
      ...exercise,
      equipment: equipmentByName.get(exercise.exerciseName) ?? null,
    })),
  };
};

// Used by the AI chat tool (log_set, exerciseId path) — deliberately
// additive, unlike logStandaloneWorkout above which replaces the whole
// day's log wholesale. A chat message like "log 3 sets of bench press"
// should only ever add to whatever's already logged for that date (e.g.
// squats logged earlier), never silently wipe it out to leave just the
// one exercise.
//
// Takes an already-resolved exerciseId, not a free-text name — resolving
// natural-language exercise names against the catalog now happens
// upstream, via the search_exercises chat tool (see
// exercises.service.ts's searchExercises), before this is ever called.
// That split is deliberate: the model reasons about candidates/confidence
// and disambiguates with the user BEFORE committing to a write, instead
// of this function discovering ambiguity/no-match only after the model
// already guessed a name.
export const logExerciseSetsForDate = async (
  userId: string,
  exerciseId: string,
  sets: Array<{ weight: number | null; reps: number }>,
  dateStr: string,
) => {
  if (sets.length === 0) {
    throw new AppError(400, "At least one set is required");
  }

  const catalogEntry = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  });
  if (!catalogEntry) {
    throw new AppError(
      404,
      "That exercise id doesn't exist — call search_exercises again.",
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

// Shown on another user's public profile's Workouts tab (rendered as a
// month calendar, same as getPublicNutritionHistory's Nutrition tab) —
// gated by the same isLeaderboardVisible/username eligibility as
// getPublicProfile, except when viewing your own profile (that gate
// controls what OTHER people can see, not your own access to your own
// data). Standalone-only (same `programExerciseId: null` filter as
// getWorkoutLogsForDate above) — the profile screen renders this
// alongside the active-program section (see getPublicActiveProgram), not
// as a replacement for it, so program-linked logs would otherwise show
// twice.
export const getPublicWorkoutHistory = async (
  viewerId: string,
  targetUserId: string,
  // "YYYY-MM" — defaults to the current calendar month (server's own
  // clock) when omitted, same convention as getPublicNutritionHistory.
  monthKey?: string,
) => {
  if (viewerId !== targetUserId) {
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
  }

  const today = new Date();
  const [monthYear, monthNum] =
    monthKey && /^\d{4}-\d{2}$/.test(monthKey)
      ? monthKey.split("-").map(Number)
      : [today.getFullYear(), today.getMonth() + 1];

  const windowStart = new Date(monthYear, monthNum - 1, 1, 0, 0, 0, 0);
  const windowEnd = new Date(monthYear, monthNum, 0, 23, 59, 59, 999);

  const workoutLogs = await prisma.workoutLog.findMany({
    where: {
      userId: targetUserId,
      loggedAt: { gte: windowStart, lte: windowEnd },
      exercises: { every: { programExerciseId: null } },
    },
    include: { exercises: { include: { sets: true } } },
    orderBy: { loggedAt: "desc" },
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
