import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getNewsFeed, NewsCategory } from "./news.service";

const VALID_CATEGORIES: NewsCategory[] = [
  "top_stories",
  "sports",
  "politics",
  "world",
  "crime",
  "local",
  "fitness_nutrition",
];

export const getNewsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { q, categories } = req.query;

    const parsedCategories =
      typeof categories === "string" && categories.trim().length > 0
        ? categories
            .split(",")
            .map((c) => c.trim())
            .filter((c): c is NewsCategory =>
              VALID_CATEGORIES.includes(c as NewsCategory),
            )
        : undefined;

    const articles = await getNewsFeed(
      req.userId!,
      typeof q === "string" ? q : undefined,
      parsedCategories,
    );
    sendSuccess(res, 200, "NEWS_FETCHED", { articles });
  },
);
