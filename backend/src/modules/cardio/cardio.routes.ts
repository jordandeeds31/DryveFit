import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  createCardioSessionHandler,
  getCardioSessionsHandler,
  getCardioSessionHandler,
  deleteCardioSessionHandler,
} from "./cardio.controller";

const router = Router();

router.use(authMiddleware);

router.post("/", createCardioSessionHandler);
router.get("/", getCardioSessionsHandler);
router.get("/:id", getCardioSessionHandler);
router.delete("/:id", deleteCardioSessionHandler);

export default router;
