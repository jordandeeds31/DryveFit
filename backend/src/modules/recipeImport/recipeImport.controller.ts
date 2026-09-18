import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  extractRecipeFromLink,
  saveRecipe,
  getSavedRecipes,
  getDiscoverRecipes,
  logSavedRecipeToMeal,
  ExtractedRecipe,
  RecipeExtractionIngredient,
} from "./recipeImport.service";
import { MEAL_TYPES, MealType } from "../nutrition/nutrition.service";

const ERROR_STATUS_BY_REASON: Record<string, number> = {
  invalid_url: 400,
  unsupported_platform: 400,
  not_found_or_private: 404,
  network_error: 502,
};

export const extractRecipeFromLinkHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { url } = req.body;
    if (typeof url !== "string" || url.trim() === "") {
      throw new AppError(400, "url is required");
    }

    const outcome = await extractRecipeFromLink(url.trim(), req.userId!);

    if (outcome.status === "error") {
      // Logged regardless of isOperational status — "unsupported_platform"
      // in particular is easy to trigger from a URL shape this module's
      // hostname matching doesn't recognize (a redirector, a share-sheet
      // wrapper, etc.), and the raw URL is the only way to tell those
      // apart from a genuinely unsupported platform.
      console.log(`Recipe import error [${outcome.reason}] for URL: ${url.trim()}`);
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

    if (outcome.status === "already_saved") {
      sendSuccess(res, 200, "RECIPE_ALREADY_SAVED", { recipe: outcome.recipe });
      return;
    }

    sendSuccess(res, 200, "RECIPE_EXTRACTED", { recipe: outcome.recipe });
  },
);

const isValidIngredient = (value: unknown): value is RecipeExtractionIngredient => {
  if (typeof value !== "object" || value === null) return false;
  const ingredient = value as Record<string, unknown>;
  return (
    typeof ingredient.name === "string" &&
    (ingredient.quantity === null || typeof ingredient.quantity === "number") &&
    (ingredient.unit === null || typeof ingredient.unit === "string")
  );
};

export const saveRecipeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { title, ingredients, steps, sourcePlatform, sourceUrl, thumbnailUrl } =
      req.body;

    if (typeof title !== "string" || title.trim() === "") {
      throw new AppError(400, "title is required");
    }
    if (!Array.isArray(ingredients) || !ingredients.every(isValidIngredient)) {
      throw new AppError(400, "ingredients must be a list of {name, quantity, unit}");
    }
    if (!Array.isArray(steps) || !steps.every((step) => typeof step === "string")) {
      throw new AppError(400, "steps must be a list of strings");
    }
    if (sourcePlatform !== "tiktok" && sourcePlatform !== "youtube") {
      throw new AppError(400, "Invalid sourcePlatform");
    }
    if (typeof sourceUrl !== "string" || sourceUrl.trim() === "") {
      throw new AppError(400, "sourceUrl is required");
    }
    if (thumbnailUrl !== null && typeof thumbnailUrl !== "string") {
      throw new AppError(400, "thumbnailUrl must be a string or null");
    }

    const input: ExtractedRecipe = {
      title: title.trim(),
      ingredients,
      steps,
      sourcePlatform,
      sourceUrl,
      thumbnailUrl,
    };
    const recipe = await saveRecipe(req.userId!, input);
    sendSuccess(res, 201, "RECIPE_SAVED", { recipe });
  },
);

export const getSavedRecipesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const recipes = await getSavedRecipes(req.userId!);
    sendSuccess(res, 200, "SAVED_RECIPES_FETCHED", { recipes });
  },
);

export const getDiscoverRecipesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { q } = req.query;
    const recipes = await getDiscoverRecipes(
      typeof q === "string" ? q : undefined,
    );
    sendSuccess(res, 200, "DISCOVER_RECIPES_FETCHED", { recipes });
  },
);

export const logSavedRecipeToMealHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { mealType, date } = req.body;

    if (typeof id !== "string") {
      throw new AppError(400, "id is required");
    }
    if (!MEAL_TYPES.includes(mealType)) {
      throw new AppError(400, "Invalid mealType");
    }
    if (typeof date !== "string" || date.trim() === "") {
      throw new AppError(400, "date is required");
    }

    const entry = await logSavedRecipeToMeal(
      req.userId!,
      id,
      mealType as MealType,
      date,
    );
    sendSuccess(res, 201, "RECIPE_LOGGED", { entry });
  },
);
