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
