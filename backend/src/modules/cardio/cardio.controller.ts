import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  createCardioSession,
  getCardioSessionsForUser,
  getCardioSessionById,
  deleteCardioSession,
  CardioActivityType,
  CardioRoutePoint,
} from "./cardio.service";

export const createCardioSessionHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const {
      activityType,
      startedAt,
      endedAt,
      distanceMeters,
      caloriesBurned,
      avgHeartRate,
      maxHeartRate,
      stepCount,
      route,
    } = req.body;

    if (typeof activityType !== "string") {
      throw new AppError(400, "activityType is required");
    }
    if (typeof startedAt !== "string" || typeof endedAt !== "string") {
      throw new AppError(400, "startedAt and endedAt are required");
    }
    if (typeof distanceMeters !== "number") {
      throw new AppError(400, "distanceMeters is required");
    }
    if (
      caloriesBurned !== null &&
      caloriesBurned !== undefined &&
      typeof caloriesBurned !== "number"
    ) {
      throw new AppError(400, "caloriesBurned must be a number or null");
    }
    if (
      avgHeartRate !== null &&
      avgHeartRate !== undefined &&
      typeof avgHeartRate !== "number"
    ) {
      throw new AppError(400, "avgHeartRate must be a number or null");
    }
    if (
      maxHeartRate !== null &&
      maxHeartRate !== undefined &&
      typeof maxHeartRate !== "number"
    ) {
      throw new AppError(400, "maxHeartRate must be a number or null");
    }
    if (
      stepCount !== null &&
      stepCount !== undefined &&
      typeof stepCount !== "number"
    ) {
      throw new AppError(400, "stepCount must be a number or null");
    }
    if (!Array.isArray(route)) {
      throw new AppError(400, "route must be an array of points");
    }

    const session = await createCardioSession(req.userId!, {
      activityType: activityType as CardioActivityType,
      startedAt: new Date(startedAt),
      endedAt: new Date(endedAt),
      distanceMeters,
      caloriesBurned: caloriesBurned ?? null,
      avgHeartRate: avgHeartRate ?? null,
      maxHeartRate: maxHeartRate ?? null,
      stepCount: stepCount ?? null,
      route: route as CardioRoutePoint[],
    });

    sendSuccess(res, 201, "CARDIO_SESSION_CREATED", { session });
  },
);

export const getCardioSessionsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const sessions = await getCardioSessionsForUser(req.userId!);
    sendSuccess(res, 200, "CARDIO_SESSIONS_FETCHED", { sessions });
  },
);

export const getCardioSessionHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      throw new AppError(400, "id is required");
    }

    const session = await getCardioSessionById(req.userId!, id);
    sendSuccess(res, 200, "CARDIO_SESSION_FETCHED", { session });
  },
);

export const deleteCardioSessionHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    if (typeof id !== "string") {
      throw new AppError(400, "id is required");
    }

    await deleteCardioSession(req.userId!, id);
    sendSuccess(res, 200, "CARDIO_SESSION_DELETED", {});
  },
);
