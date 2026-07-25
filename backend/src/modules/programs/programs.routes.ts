import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  createProgramHandler,
  listProgramsHandler,
  getProgramHandler,
  deactivateProgramHandler,
  getScheduleHandler,
  getProgramDayHandler,
} from "./programs.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", createProgramHandler);
router.get("/", listProgramsHandler);
router.get("/schedules", getScheduleHandler);
router.get("/:id/day", getProgramDayHandler);
router.get("/:id", getProgramHandler);
router.patch("/:id/deactivate", deactivateProgramHandler);

export default router;
