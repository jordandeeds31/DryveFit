import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  logStandaloneWorkout,
  getWorkoutLogsForDate,
} from "./workoutLogs.service";

export const logStandaloneWorkoutHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { exercises, date } = req.body;

    if (!Array.isArray(exercises)) {
      throw new AppError(400, "exercises must be an array");
    }

    if (typeof date !== "string") {
      throw new AppError(400, "date is required");
    }

    const workoutLog = await logStandaloneWorkout(req.userId!, exercises, date);
    sendSuccess(res, 201, "WORKOUT_LOGGED", { workoutLog });
  },
);

export const getWorkoutLogsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const date = req.query.date;

    if (typeof date !== "string") {
      throw new AppError(400, "date query parameter is required");
    }

    const workoutLogs = await getWorkoutLogsForDate(req.userId!, date);
    sendSuccess(res, 200, "WORKOUT_LOGS_FETCHED", { workoutLogs });
  },
);
