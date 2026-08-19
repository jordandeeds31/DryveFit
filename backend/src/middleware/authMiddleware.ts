import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import AppError from "../utils/AppError";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "Unauthorized: No token provided"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return next(new AppError(401, "Unauthorized: Invalid token"));
  }
};
