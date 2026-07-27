import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  logStandaloneWorkoutHandler,
  getWorkoutLogsHandler,
} from "./workoutLog.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", logStandaloneWorkoutHandler);
router.get("/", getWorkoutLogsHandler);

export default router;
