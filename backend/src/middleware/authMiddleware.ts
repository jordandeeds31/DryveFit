import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import AppError from "../utils/AppError";
import prisma from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "Unauthorized: No token provided"));
  }

  const token = authHeader.split(" ")[1];

  let userId: string;
  try {
    const payload = verifyAccessToken(token);
    userId = payload.userId;
  } catch (err) {
    return next(new AppError(401, "Unauthorized: Invalid token"));
  }

  // A signature-valid, unexpired JWT can still reference a user that no
  // longer exists — access tokens aren't revoked server-side on account
  // deletion (they just live out their full expiry), so without this
  // check a deleted account's token would sail through here and only
  // fail deep inside some handler's own DB lookup, as a masked 500 that
  // the frontend's 401-only session-expiry handling never catches.
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return next(
        new AppError(401, "Unauthorized: Account no longer exists"),
      );
    }
  } catch (err) {
    return next(err);
  }

  req.userId = userId;
  next();
};
