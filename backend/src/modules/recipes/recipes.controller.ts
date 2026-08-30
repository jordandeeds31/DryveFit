import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  searchRecipes,
  getRecipeDetail,
  getRecipePriceBreakdown,
} from "./recipes.service";

const parseRecipeId = (raw: unknown): number => {
  const id = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, "Invalid recipe id");
  }
  return id;
};

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

export const searchRecipesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { query, cuisine, diet, mealType, sort } = req.query;
    if (sort !== undefined && sort !== "popularity") {
      throw new AppError(400, "sort must be 'popularity'");
    }

    // Empty query is valid — combined with sort=popularity (and/or the
    // other filters), it's how the Recipes tab's default "browse" list
    // (no search term yet) is fetched.
    const results = await searchRecipes({
      query: asOptionalString(query),
      cuisine: asOptionalString(cuisine),
      diet: asOptionalString(diet),
      mealType: asOptionalString(mealType),
      sort: sort as "popularity" | undefined,
    });
    sendSuccess(res, 200, "RECIPE_SEARCH_RESULTS", { results });
  },
);

export const getRecipeDetailHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const id = parseRecipeId(req.params.id);
    const recipe = await getRecipeDetail(id);
    sendSuccess(res, 200, "RECIPE_DETAIL_FETCHED", { recipe });
  },
);

export const getRecipePriceBreakdownHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const id = parseRecipeId(req.params.id);
    const breakdown = await getRecipePriceBreakdown(id);
    sendSuccess(res, 200, "RECIPE_PRICE_BREAKDOWN_FETCHED", { breakdown });
  },
);
