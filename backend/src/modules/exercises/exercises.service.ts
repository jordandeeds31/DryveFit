import prisma from "../../lib/prisma";

export const getAllExercises = async () => {
  return prisma.exercise.findMany({
    orderBy: { name: "asc" },
  });
};
