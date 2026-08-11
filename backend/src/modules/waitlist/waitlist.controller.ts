import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import AppError from "../../utils/AppError";
import { sendSuccess } from "../../utils/apiResponse";
import { addWaitlistSignup } from "./waitlist.service";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const joinWaitlistHandler = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
      throw new AppError(400, "A valid email is required");
    }

    await addWaitlistSignup(email);
    sendSuccess(res, 201, "WAITLIST_JOINED", { email: email.trim().toLowerCase() });
  },
);
