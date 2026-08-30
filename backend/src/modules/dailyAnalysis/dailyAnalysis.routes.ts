import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  runDailyAnalysisHandler,
  getDailyAnalysisHandler,
  markDailyAnalysisViewedHandler,
} from "./dailyAnalysis.controller";

const router = Router();

router.use(authMiddleware);

router.post("/run", runDailyAnalysisHandler);
router.get("/:date", getDailyAnalysisHandler);
router.post("/:id/viewed", markDailyAnalysisViewedHandler);

export default router;
