import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";

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
