import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  logStandaloneWorkout,
  getWorkoutLogsForDate,
  deleteWorkoutLogSet,
  deleteWorkoutLogsForDate,
} from "./workoutLogs.service";

const getParam = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};

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

export const deleteWorkoutLogsForDateHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const date = req.query.date;

    if (typeof date !== "string") {
      throw new AppError(400, "date query parameter is required");
    }

    await deleteWorkoutLogsForDate(req.userId!, date);
    sendSuccess(res, 200, "WORKOUT_LOGS_DELETED", {});
  },
);

export const deleteWorkoutLogSetHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exerciseLogId = getParam(req.params.exerciseLogId);
    const setId = getParam(req.params.setId);

    await deleteWorkoutLogSet(req.userId!, exerciseLogId, setId);
    sendSuccess(res, 200, "WORKOUT_LOG_SET_DELETED", {});
  },
);
