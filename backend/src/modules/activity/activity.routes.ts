import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getWorkingOutCountHandler } from "./activity.controller";

const router = Router();

router.use(authMiddleware);

router.get("/working-out-count", getWorkingOutCountHandler);

export default router;
