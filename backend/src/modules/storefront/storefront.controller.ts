import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import { getInterestSummary, registerInterest } from "./storefront.service";

export const getInterestSummaryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { productKey } = req.query;
    if (typeof productKey !== "string") {
      throw new AppError(400, "productKey is required");
    }

    const summary = await getInterestSummary(req.userId!, productKey);
    sendSuccess(res, 200, "MERCH_INTEREST_FETCHED", summary);
  },
);

export const registerInterestHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { productKey } = req.body;
    if (typeof productKey !== "string") {
      throw new AppError(400, "productKey is required");
    }

    const summary = await registerInterest(req.userId!, productKey);
    sendSuccess(res, 201, "MERCH_INTEREST_REGISTERED", summary);
  },
);
