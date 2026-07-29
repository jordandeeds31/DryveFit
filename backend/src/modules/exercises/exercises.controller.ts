import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getAllExercises, getExercise1RMHistory } from "./exercises.service";
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
