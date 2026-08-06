import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import { getLeaderboard, getMostPopularExercise } from "./leaderboard.service";

export const getLeaderboardHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exerciseName = req.query.exerciseName;
    const scope = req.query.scope ?? "global";
    const gender = req.query.gender;

    if (typeof exerciseName !== "string" || exerciseName.trim() === "") {
      throw new AppError(400, "exerciseName query parameter is required");
    }
    if (scope !== "city" && scope !== "global") {
      throw new AppError(400, "scope must be 'city' or 'global'");
    }
    if (gender !== "male" && gender !== "female") {
      throw new AppError(400, "gender must be 'male' or 'female'");
    }

    const leaderboard = await getLeaderboard(
      req.userId!,
      exerciseName,
      scope,
      gender,
    );
    sendSuccess(res, 200, "LEADERBOARD_FETCHED", { leaderboard });
  },
);

export const getPopularExerciseHandler = catchAsync(
  async (_req: AuthRequest, res: Response) => {
    const exercise = await getMostPopularExercise();
    sendSuccess(res, 200, "POPULAR_EXERCISE_FETCHED", { exercise });
  },
);
