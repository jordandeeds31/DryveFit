import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import AppError from "../../utils/AppError";
import {
  createUser,
  validateUser,
  generateAccessToken,
  requestPasswordReset,
  resetPasswordWithCode,
} from "./auth.service";

export const signup = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || email.trim() === "") {
    throw new AppError(400, "email is required");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError(400, "password must be at least 8 characters");
  }

  const user = await createUser({ email, password });

  const accessToken = generateAccessToken(user.id);

  res.status(201).json({ user, accessToken });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await validateUser({ email, password });

  const accessToken = generateAccessToken(user.id);

  res.status(200).json({ user, accessToken });
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (typeof email !== "string" || email.trim() === "") {
      throw new AppError(400, "email is required");
    }

    const result = await requestPasswordReset(email);
    res.status(200).json(result);
  },
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body;

    if (typeof email !== "string" || email.trim() === "") {
      throw new AppError(400, "email is required");
    }
    if (typeof code !== "string" || code.trim() === "") {
      throw new AppError(400, "code is required");
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      throw new AppError(400, "newPassword must be at least 8 characters");
    }

    await resetPasswordWithCode({ email, code, newPassword });
    res.status(200).json({ message: "Password reset successfully" });
  },
);
