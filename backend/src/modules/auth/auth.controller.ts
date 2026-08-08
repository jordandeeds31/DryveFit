import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import AppError from "../../utils/AppError";
import { createUser, validateUser, generateAccessToken } from "./auth.service";

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
