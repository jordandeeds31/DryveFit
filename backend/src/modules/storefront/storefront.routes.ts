import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getInterestSummaryHandler,
  registerInterestHandler,
} from "./storefront.controller";

const router = Router();

router.use(authMiddleware);

router.get("/interest", getInterestSummaryHandler);
router.post("/interest", registerInterestHandler);

export default router;
