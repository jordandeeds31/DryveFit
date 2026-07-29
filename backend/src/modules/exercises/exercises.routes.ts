import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getExercisesHandler,
  getExercise1RMHistoryHandler,
} from "./exercises.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getExercisesHandler);
router.get("/1rm-history", getExercise1RMHistoryHandler);

export default router;
