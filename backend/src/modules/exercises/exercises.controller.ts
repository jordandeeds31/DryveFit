import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getAllExercises,
  getExercise1RMHistory,
  getExerciseImage,
  getPreviousSession,
} from "./exercises.service";
import AppError from "../../utils/AppError";

export const getExercisesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exercises = await getAllExercises();
    sendSuccess(res, 200, "EXERCISES_FETCHED", { exercises });
  },
);

export const getExercise1RMHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exerciseName = req.query.name;

    if (typeof exerciseName !== "string") {
      throw new AppError(400, "name query parameter is required");
    }

    const history = await getExercise1RMHistory(req.userId!, exerciseName);
    sendSuccess(res, 200, "1RM_HISTORY_FETCHED", { history });
  },
);

export const getPreviousSessionHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exerciseName = req.query.name;
    const before = req.query.before;

    if (typeof exerciseName !== "string") {
      throw new AppError(400, "name query parameter is required");
    }
    if (before !== undefined && typeof before !== "string") {
      throw new AppError(400, "before must be a date string");
    }

    const session = await getPreviousSession(req.userId!, exerciseName, before);
    sendSuccess(res, 200, "PREVIOUS_SESSION_FETCHED", { session });
  },
);

export const getExerciseImageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exerciseName = req.query.name;

    if (typeof exerciseName !== "string") {
      throw new AppError(400, "name query parameter is required");
    }

    const image = await getExerciseImage(exerciseName);

    if (!image) {
      throw new AppError(404, "Image not found");
    }

    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.send(image.buffer);
  },
);
