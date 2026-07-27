import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getExercisesHandler } from "./exercises.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getExercisesHandler);

export default router;
