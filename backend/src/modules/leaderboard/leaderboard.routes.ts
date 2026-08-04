import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getLeaderboardHandler } from "./leaderboard.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getLeaderboardHandler);

export default router;
