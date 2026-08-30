import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  searchFoodHandler,
  getFoodDetailHandler,
  logFoodHandler,
  updateFoodLogEntryHandler,
  estimateMacrosHandler,
  estimateMacrosFromPhotoHandler,
  deleteFoodLogEntryHandler,
  getDiaryHandler,
  getLoggedDateKeysHandler,
  getDailyRecapHandler,
  getMacroHistoryHandler,
  updateNutritionProfileHandler,
  updateNutritionGoalHandler,
  getNutritionProfileHandler,
  getWeightTrendHandler,
} from "./nutrition.controller";

// Same multer setup + MulterError-wrapping as bodyScans.routes.ts — a
// single food photo, not a video, so the same 15MB cap applies.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadFoodPhotoMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("photo")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new AppError(413, "That photo is too large — try a smaller one (15MB max)."));
      }
      return next(new AppError(400, err.message));
    }
    next(err instanceof Error ? new AppError(400, err.message) : err);
  });
};

const router = Router();

router.use(authMiddleware);

router.get("/search", searchFoodHandler);
router.post("/food-detail", getFoodDetailHandler);
router.post("/estimate-macros", estimateMacrosHandler);
router.post(
  "/estimate-macros-photo",
  uploadFoodPhotoMiddleware,
  estimateMacrosFromPhotoHandler,
);
router.post("/log", logFoodHandler);
router.patch("/log/:entryId", updateFoodLogEntryHandler);
router.delete("/log/:entryId", deleteFoodLogEntryHandler);
router.get("/diary", getDiaryHandler);
router.get("/recap", getDailyRecapHandler);
router.get("/macro-history", getMacroHistoryHandler);
router.get("/logged-dates", getLoggedDateKeysHandler);
router.get("/profile", getNutritionProfileHandler);
router.get("/weight-trend", getWeightTrendHandler);
router.patch("/profile", updateNutritionProfileHandler);
router.patch("/goal", updateNutritionGoalHandler);

export default router;
