import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

interface AppError extends Error {
  status?: number;
  isOperational?: boolean;
}

const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const status = err.status || 500;
  const isOperational = err.isOperational ?? false;

  // A masked (non-operational) error means the client only ever sees the
  // generic "Something went wrong" — this was the ONLY record of what
  // actually happened, and it wasn't being logged anywhere, making any
  // production-only incident like this unfixable without a guess.
  if (!isOperational) {
    console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  }

  if (env.NODE_ENV === "development") {
    res.status(status).json({
      status: "error",
      message: err.message,
      stack: err.stack,
    });
  } else {
    res.status(status).json({
      status: "error",
      message: isOperational ? err.message : "Something went wrong",
    });
  }
};

export default errorHandler;
