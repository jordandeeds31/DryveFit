import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  searchRecipesHandler,
  getRecipeDetailHandler,
  getRecipePriceBreakdownHandler,
} from "./recipes.controller";

const router = Router();

router.use(authMiddleware);

router.get("/search", searchRecipesHandler);
router.get("/:id", getRecipeDetailHandler);
router.get("/:id/price-breakdown", getRecipePriceBreakdownHandler);

export default router;
