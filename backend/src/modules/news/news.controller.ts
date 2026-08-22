import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getNewsFeed } from "./news.service";

export const getNewsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { q } = req.query;
    const articles = await getNewsFeed(
      req.userId!,
      typeof q === "string" ? q : undefined,
    );
    sendSuccess(res, 200, "NEWS_FETCHED", { articles });
  },
);
