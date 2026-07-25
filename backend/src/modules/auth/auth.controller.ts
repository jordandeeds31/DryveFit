import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { createUser, validateUser, generateAccessToken } from "./auth.service";

export const signup = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
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
