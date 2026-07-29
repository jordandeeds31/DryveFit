import prisma from "../../lib/prisma";

export const getAllExercises = async () => {
  return prisma.exercise.findMany({
    orderBy: { name: "asc" },
  });
};

export const getExercise1RMHistory = async (
  userId: string,
  exerciseName: string,
) => {
  const logs = await prisma.exerciseLog.findMany({
    where: {
      exerciseName,
      workoutLog: { userId },
    },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      workoutLog: { select: { loggedAt: true } },
    },
    orderBy: { workoutLog: { loggedAt: "asc" } },
  });

  return logs.map((log) => {
    // Use the heaviest estimated 1RM among that session's sets
    const best1RM = Math.max(
      ...log.sets
        .filter((set) => set.weight != null && set.reps != null)
        .map((set) => Math.round(set.weight! * (1 + set.reps! / 30))),
    );

    return {
      date: log.workoutLog.loggedAt,
      estimated1RM: best1RM,
      sets: log.sets,
    };
  });
};
