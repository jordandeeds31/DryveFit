import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  searchFood,
  getFoodDetail,
  logFood,
  deleteFoodLogEntry,
  getDiaryForDate,
  getLoggedDateKeys,
  getDailyRecap,
  updateNutritionProfile,
  updateNutritionGoalOverride,
  getNutritionProfile,
  MEAL_TYPES,
  MealType,
} from "./nutrition.service";

export const searchFoodHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { query } = req.query;
    if (typeof query !== "string" || query.trim() === "") {
      throw new AppError(400, "query is required");
    }

    const results = await searchFood(query);
    sendSuccess(res, 200, "FOOD_SEARCH_RESULTS", results);
  },
);

export const getFoodDetailHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { type, id } = req.body;
    if (type !== "common" && type !== "branded") {
      throw new AppError(400, "type must be 'common' or 'branded'");
    }
    if (typeof id !== "string" || id.trim() === "") {
      throw new AppError(400, "id is required");
    }

    const detail = await getFoodDetail(type, id);
    sendSuccess(res, 200, "FOOD_DETAIL_FETCHED", detail);
  },
);

export const logFoodHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const {
      date,
      mealType,
      foodName,
      brandName,
      servingQty,
      servingUnit,
      calories,
      proteinG,
      carbsG,
      fatG,
    } = req.body;

    if (typeof date !== "string" || date.trim() === "") {
      throw new AppError(400, "date is required");
    }
    if (!MEAL_TYPES.includes(mealType)) {
      throw new AppError(400, "Invalid mealType");
    }
    if (typeof foodName !== "string" || foodName.trim() === "") {
      throw new AppError(400, "foodName is required");
    }
    if (typeof servingQty !== "number" || servingQty <= 0) {
      throw new AppError(400, "servingQty must be a positive number");
    }
    if (typeof servingUnit !== "string" || servingUnit.trim() === "") {
      throw new AppError(400, "servingUnit is required");
    }
    if (
      typeof calories !== "number" ||
      typeof proteinG !== "number" ||
      typeof carbsG !== "number" ||
      typeof fatG !== "number"
    ) {
      throw new AppError(400, "calories/proteinG/carbsG/fatG must be numbers");
    }

    const entry = await logFood(req.userId!, {
      date,
      mealType: mealType as MealType,
      foodName,
      brandName: typeof brandName === "string" ? brandName : null,
      servingQty,
      servingUnit,
      calories,
      proteinG,
      carbsG,
      fatG,
    });
    sendSuccess(res, 201, "FOOD_LOGGED", { entry });
  },
);

export const deleteFoodLogEntryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { entryId } = req.params;
    if (typeof entryId !== "string") {
      throw new AppError(400, "entryId is required");
    }
    await deleteFoodLogEntry(req.userId!, entryId);
    sendSuccess(res, 200, "FOOD_LOG_ENTRY_DELETED", { message: "Deleted" });
  },
);

export const getDiaryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { date } = req.query;
    if (typeof date !== "string") {
      throw new AppError(400, "date query parameter is required");
    }

    const diary = await getDiaryForDate(req.userId!, date);
    sendSuccess(res, 200, "DIARY_FETCHED", diary);
  },
);

export const getDailyRecapHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { date } = req.query;
    if (typeof date !== "string") {
      throw new AppError(400, "date query parameter is required");
    }

    const recap = await getDailyRecap(req.userId!, date);
    sendSuccess(res, 200, "DAILY_RECAP_FETCHED", recap);
  },
);

export const getLoggedDateKeysHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    if (typeof startDate !== "string" || typeof endDate !== "string") {
      throw new AppError(400, "startDate and endDate query parameters are required");
    }

    const dateKeys = await getLoggedDateKeys(req.userId!, startDate, endDate);
    sendSuccess(res, 200, "LOGGED_DATES_FETCHED", { dateKeys });
  },
);

export const updateNutritionProfileHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { gender, weightLbs, heightInches, age, activityLevel, goalType } =
      req.body;

    if (
      typeof gender !== "string" ||
      typeof weightLbs !== "number" ||
      typeof heightInches !== "number" ||
      typeof age !== "number" ||
      typeof activityLevel !== "string" ||
      typeof goalType !== "string"
    ) {
      throw new AppError(400, "Missing or invalid nutrition profile fields");
    }

    const profile = await updateNutritionProfile(req.userId!, {
      gender,
      weightLbs,
      heightInches,
      age,
      activityLevel,
      goalType: goalType as "lose" | "maintain" | "gain",
    });
    sendSuccess(res, 200, "NUTRITION_PROFILE_UPDATED", { profile });
  },
);

export const updateNutritionGoalHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { calories, proteinG, carbsG, fatG } = req.body;

    if (
      typeof calories !== "number" ||
      typeof proteinG !== "number" ||
      typeof carbsG !== "number" ||
      typeof fatG !== "number"
    ) {
      throw new AppError(400, "calories/proteinG/carbsG/fatG must be numbers");
    }

    const profile = await updateNutritionGoalOverride(req.userId!, {
      calories,
      proteinG,
      carbsG,
      fatG,
    });
    sendSuccess(res, 200, "NUTRITION_GOAL_UPDATED", { profile });
  },
);

export const getNutritionProfileHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const profile = await getNutritionProfile(req.userId!);
    sendSuccess(res, 200, "NUTRITION_PROFILE_FETCHED", { profile });
  },
);
