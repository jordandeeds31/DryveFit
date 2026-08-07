import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getCardioLeaderboardHandler } from "./cardioLeaderboard.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getCardioLeaderboardHandler);

export default router;
