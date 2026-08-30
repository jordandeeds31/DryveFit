import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import { importRecipeFromLink, getSavedRecipes } from "./recipeImport.service";

const ERROR_STATUS_BY_REASON: Record<string, number> = {
  invalid_url: 400,
  unsupported_platform: 400,
  not_found_or_private: 404,
  network_error: 502,
};

export const importRecipeFromLinkHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { url } = req.body;
    if (typeof url !== "string" || url.trim() === "") {
      throw new AppError(400, "url is required");
    }

    const outcome = await importRecipeFromLink(req.userId!, url.trim());

    if (outcome.status === "error") {
      throw new AppError(
        ERROR_STATUS_BY_REASON[outcome.reason] ?? 500,
        outcome.message,
      );
    }

    if (outcome.status === "no_recipe_detected") {
      sendSuccess(res, 200, "RECIPE_NOT_DETECTED", {
        captionPreview: outcome.captionPreview,
      });
      return;
    }

    sendSuccess(res, 201, "RECIPE_IMPORTED", { recipe: outcome.recipe });
  },
);

export const getSavedRecipesHandler = catchAsync(
  async (_req: AuthRequest, res: Response) => {
    const recipes = await getSavedRecipes();
    sendSuccess(res, 200, "SAVED_RECIPES_FETCHED", { recipes });
  },
);
