import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getAllExercises } from "./exercises.service";

export const getExercisesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exercises = await getAllExercises();
    sendSuccess(res, 200, "EXERCISES_FETCHED", { exercises });
  },
);
