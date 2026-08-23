import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  createProgramHandler,
  listProgramsHandler,
  getProgramHandler,
  deactivateProgramHandler,
  deleteProgramHandler,
  getScheduleHandler,
  getProgramDayHandler,
  logExercisePerformanceHandler,
  deleteExercisePerformanceHandler,
  swapProgramExerciseHandler,
  addProgramExerciseHandler,
  revertDaySwapsHandler,
  deleteProgramExerciseHandler,
  postponeProgramDayHandler,
  inheritWorkoutDayHandler,
  inheritWorkoutDayAsNewProgramHandler,
} from "./programs.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", createProgramHandler);
router.get("/", listProgramsHandler);
router.get("/schedules", getScheduleHandler);
router.get("/:id/day", getProgramDayHandler);
router.get("/:id", getProgramHandler);

router.post("/exercises/:exerciseId/log", logExercisePerformanceHandler);
router.delete("/exercises/:exerciseId/log", deleteExercisePerformanceHandler);
router.patch("/exercises/:exerciseId/swap", swapProgramExerciseHandler);
router.delete("/exercises/:exerciseId", deleteProgramExerciseHandler);
router.post("/days/:dayId/exercises", addProgramExerciseHandler);
router.post("/days/:dayId/revert-swaps", revertDaySwapsHandler);
router.post("/days/:dayId/postpone", postponeProgramDayHandler);
router.post("/days/:dayId/inherit", inheritWorkoutDayHandler);
router.post(
  "/days/:dayId/inherit-as-new-program",
  inheritWorkoutDayAsNewProgramHandler,
);
router.patch("/:id/deactivate", deactivateProgramHandler);
router.delete("/:id", deleteProgramHandler);

export default router;
