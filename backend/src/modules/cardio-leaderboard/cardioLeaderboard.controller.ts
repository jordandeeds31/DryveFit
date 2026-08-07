import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  getCardioLeaderboard,
  CARDIO_LEADERBOARD_CATEGORIES,
  CARDIO_ACTIVITY_TYPES,
  CardioLeaderboardCategory,
  CardioActivityType,
} from "./cardioLeaderboard.service";

export const getCardioLeaderboardHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const activityType = req.query.activityType;
    const category = req.query.category;
    const gender = req.query.gender;

    if (
      typeof activityType !== "string" ||
      !CARDIO_ACTIVITY_TYPES.includes(activityType as CardioActivityType)
    ) {
      throw new AppError(
        400,
        `activityType must be one of: ${CARDIO_ACTIVITY_TYPES.join(", ")}`,
      );
    }
    if (
      typeof category !== "string" ||
      !CARDIO_LEADERBOARD_CATEGORIES.includes(
        category as CardioLeaderboardCategory,
      )
    ) {
      throw new AppError(
        400,
        `category must be one of: ${CARDIO_LEADERBOARD_CATEGORIES.join(", ")}`,
      );
    }
    if (gender !== "male" && gender !== "female") {
      throw new AppError(400, "gender must be 'male' or 'female'");
    }

    const leaderboard = await getCardioLeaderboard(
      req.userId!,
      activityType as CardioActivityType,
      category as CardioLeaderboardCategory,
      gender,
    );
    sendSuccess(res, 200, "CARDIO_LEADERBOARD_FETCHED", { leaderboard });
  },
);
