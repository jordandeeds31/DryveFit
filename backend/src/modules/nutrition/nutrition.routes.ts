import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  searchFoodHandler,
  getFoodDetailHandler,
  logFoodHandler,
  updateFoodLogEntryHandler,
  estimateMacrosHandler,
  deleteFoodLogEntryHandler,
  getDiaryHandler,
  getLoggedDateKeysHandler,
  getDailyRecapHandler,
  getMacroHistoryHandler,
  updateNutritionProfileHandler,
  updateNutritionGoalHandler,
  getNutritionProfileHandler,
} from "./nutrition.controller";

const router = Router();

router.use(authMiddleware);

router.get("/search", searchFoodHandler);
router.post("/food-detail", getFoodDetailHandler);
router.post("/estimate-macros", estimateMacrosHandler);
router.post("/log", logFoodHandler);
router.patch("/log/:entryId", updateFoodLogEntryHandler);
router.delete("/log/:entryId", deleteFoodLogEntryHandler);
router.get("/diary", getDiaryHandler);
router.get("/recap", getDailyRecapHandler);
router.get("/macro-history", getMacroHistoryHandler);
router.get("/logged-dates", getLoggedDateKeysHandler);
router.get("/profile", getNutritionProfileHandler);
router.patch("/profile", updateNutritionProfileHandler);
router.patch("/goal", updateNutritionGoalHandler);

export default router;
