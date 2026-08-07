import prisma from "../../lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import AppError from "../../utils/AppError";

export const CARDIO_ACTIVITY_TYPES = ["walk", "run", "bike"] as const;
export type CardioActivityType = (typeof CARDIO_ACTIVITY_TYPES)[number];

export interface CardioRoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface CreateCardioSessionInput {
  activityType: CardioActivityType;
  startedAt: Date;
  endedAt: Date;
  distanceMeters: number;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  route: CardioRoutePoint[];
}

const CARDIO_SESSION_LIST_SELECT = {
  id: true,
  activityType: true,
  startedAt: true,
  endedAt: true,
  durationSeconds: true,
  distanceMeters: true,
  caloriesBurned: true,
  avgHeartRate: true,
  maxHeartRate: true,
  createdAt: true,
} as const;

export const createCardioSession = async (
  userId: string,
  input: CreateCardioSessionInput,
) => {
  if (!CARDIO_ACTIVITY_TYPES.includes(input.activityType)) {
    throw new AppError(400, "Invalid activityType");
  }
  if (input.distanceMeters < 0) {
    throw new AppError(400, "distanceMeters must be non-negative");
  }
  if (input.endedAt < input.startedAt) {
    throw new AppError(400, "endedAt must not be before startedAt");
  }

  const durationSeconds = Math.round(
    (input.endedAt.getTime() - input.startedAt.getTime()) / 1000,
  );

  return prisma.cardioSession.create({
    data: {
      userId,
      activityType: input.activityType,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds,
      distanceMeters: input.distanceMeters,
      caloriesBurned: input.caloriesBurned,
      avgHeartRate: input.avgHeartRate,
      maxHeartRate: input.maxHeartRate,
      route: input.route as unknown as Prisma.InputJsonValue,
    },
    select: CARDIO_SESSION_LIST_SELECT,
  });
};

// Omits `route` — history list only needs summary stats per row, and a
// route can be a few hundred points for a long run, unnecessary weight for
// a list payload.
export const getCardioSessionsForUser = async (userId: string) => {
  return prisma.cardioSession.findMany({
    where: { userId },
    select: CARDIO_SESSION_LIST_SELECT,
    orderBy: { startedAt: "desc" },
  });
};

export const getCardioSessionById = async (userId: string, id: string) => {
  const session = await prisma.cardioSession.findFirst({
    where: { id, userId },
  });

  if (!session) {
    throw new AppError(404, "Cardio session not found");
  }

  return session;
};

export const deleteCardioSession = async (userId: string, id: string) => {
  const { count } = await prisma.cardioSession.deleteMany({
    where: { id, userId },
  });

  if (count === 0) {
    throw new AppError(404, "Cardio session not found");
  }
};
