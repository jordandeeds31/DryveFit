import { Response } from "express";

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  code: string,
  result: T,
) => {
  res.status(statusCode).json({
    success: true,
    code,
    result,
  });
};
