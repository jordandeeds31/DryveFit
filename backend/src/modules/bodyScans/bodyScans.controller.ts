import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import AppError from "../../utils/AppError";
import { AuthRequest } from "../../middleware/authMiddleware";
import { createBodyScan, getBodyScanHistory } from "./bodyScans.service";

const numberOrUndefined = (value: unknown): number | undefined =>
  value !== undefined && value !== "" ? Number(value) : undefined;

export const createBodyScanHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError(400, "A photo is required for a Body Scan.");
    if (!file.mimetype.startsWith("image/")) {
      throw new AppError(400, "Photo must be an image file");
    }

    const { heightCm, weightKg, age, gender } = req.body;

    const scan = await createBodyScan(req.userId!, file.buffer, {
      heightCm: numberOrUndefined(heightCm),
      weightKg: numberOrUndefined(weightKg),
      age: numberOrUndefined(age),
      gender: typeof gender === "string" && gender !== "" ? gender : undefined,
    });

    sendSuccess(res, 201, "BODY_SCAN_CREATED", { scan });
  },
);

export const getBodyScanHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const scans = await getBodyScanHistory(req.userId!);
    sendSuccess(res, 200, "BODY_SCANS_FETCHED", { scans });
  },
);
