import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getExercisesHandler,
  getExercise1RMHistoryHandler,
  getExerciseImageHandler,
} from "./exercises.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getExercisesHandler);
router.get("/1rm-history", getExercise1RMHistoryHandler);
router.get("/image", getExerciseImageHandler);

export default router;
