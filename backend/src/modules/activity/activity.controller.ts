import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getWorkingOutCount } from "./activity.service";

export const getWorkingOutCountHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const activity = await getWorkingOutCount(req.userId!);
    sendSuccess(res, 200, "ACTIVITY_FETCHED", { activity });
  },
);
