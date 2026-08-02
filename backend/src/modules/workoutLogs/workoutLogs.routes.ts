import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  logStandaloneWorkoutHandler,
  getWorkoutLogsHandler,
  deleteWorkoutLogSetHandler,
} from "./workoutLog.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", logStandaloneWorkoutHandler);
router.get("/", getWorkoutLogsHandler);
router.delete("/exercises/:exerciseLogId/sets/:setId", deleteWorkoutLogSetHandler);

export default router;
