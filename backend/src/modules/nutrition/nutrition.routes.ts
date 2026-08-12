import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  searchFoodHandler,
  getFoodDetailHandler,
  logFoodHandler,
  deleteFoodLogEntryHandler,
  getDiaryHandler,
  getLoggedDateKeysHandler,
  getDailyRecapHandler,
  updateNutritionProfileHandler,
  updateNutritionGoalHandler,
  getNutritionProfileHandler,
} from "./nutrition.controller";

const router = Router();

router.use(authMiddleware);

router.get("/search", searchFoodHandler);
router.post("/food-detail", getFoodDetailHandler);
router.post("/log", logFoodHandler);
router.delete("/log/:entryId", deleteFoodLogEntryHandler);
router.get("/diary", getDiaryHandler);
router.get("/recap", getDailyRecapHandler);
router.get("/logged-dates", getLoggedDateKeysHandler);
router.get("/profile", getNutritionProfileHandler);
router.patch("/profile", updateNutritionProfileHandler);
router.patch("/goal", updateNutritionGoalHandler);

export default router;
