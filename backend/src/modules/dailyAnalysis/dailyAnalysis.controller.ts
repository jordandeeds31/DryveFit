import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  runDailyAnalysisForUser,
  getDailyAnalysis,
  markDailyAnalysisViewed,
} from "./dailyAnalysis.service";

// Manually-triggerable v1 — no cron/push gating yet, so this can be
// called on demand (e.g. a "Check today's progress" button) rather than
// only firing from a scheduled job.
export const runDailyAnalysisHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { date } = req.body;
    if (typeof date !== "string" || date.trim() === "") {
      throw new AppError(400, "date is required");
    }
    const analysis = await runDailyAnalysisForUser(req.userId!, date.trim());
    sendSuccess(res, 201, "DAILY_ANALYSIS_READY", { analysis });
  },
);

export const getDailyAnalysisHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { date } = req.params;
    if (typeof date !== "string") {
      throw new AppError(400, "date is required");
    }
    const analysis = await getDailyAnalysis(req.userId!, date);
    sendSuccess(res, 200, "DAILY_ANALYSIS_FETCHED", { analysis });
  },
);

export const markDailyAnalysisViewedHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string") {
      throw new AppError(400, "id is required");
    }
    await markDailyAnalysisViewed(req.userId!, id);
    sendSuccess(res, 200, "DAILY_ANALYSIS_VIEWED", {});
  },
);
