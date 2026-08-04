import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import { getLeaderboard } from "./leaderboard.service";

export const getLeaderboardHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const exerciseName = req.query.exerciseName;
    const scope = req.query.scope ?? "global";

    if (typeof exerciseName !== "string" || exerciseName.trim() === "") {
      throw new AppError(400, "exerciseName query parameter is required");
    }
    if (scope !== "city" && scope !== "global") {
      throw new AppError(400, "scope must be 'city' or 'global'");
    }

    const leaderboard = await getLeaderboard(
      req.userId!,
      exerciseName,
      scope,
    );
    sendSuccess(res, 200, "LEADERBOARD_FETCHED", { leaderboard });
  },
);
