import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getLeaderboardHandler,
  getPopularExerciseHandler,
} from "./leaderboard.controller";

const router = Router();

router.use(authMiddleware);

router.get("/popular-exercise", getPopularExerciseHandler);
router.get("/", getLeaderboardHandler);

export default router;
