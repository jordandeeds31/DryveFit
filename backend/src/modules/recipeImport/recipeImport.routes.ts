import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authMiddleware, AuthRequest } from "../../middleware/authMiddleware";
import {
  extractRecipeFromLinkHandler,
  saveRecipeHandler,
  getSavedRecipesHandler,
  getDiscoverRecipesHandler,
  logSavedRecipeToMealHandler,
} from "./recipeImport.controller";

const router = Router();

router.use(authMiddleware);

// Each import does a platform fetch plus an LLM call — meaningfully more
// expensive than a typical write, so a tighter cap than messages.routes.ts's
// send-message limiter, but generous enough that normal use (including a
// user retrying a failed share a few times) doesn't hit it. Same per-user
// (IP fallback) key pattern.
const importLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as AuthRequest).userId ?? ipKeyGenerator(req.ip ?? "unknown"),
  // Default express-rate-limit response doesn't match this app's
  // {message: "..."} error shape, so the frontend's error-message
  // extraction falls through to a cryptic generic axios message instead
  // of explaining what actually happened.
  handler: (_req, res) => {
    res.status(429).json({
      status: "error",
      message: "Too many recipe imports — wait a few minutes and try again.",
    });
  },
});

router.get("/", getSavedRecipesHandler);
router.get("/discover", getDiscoverRecipesHandler);
router.post("/extract", importLimiter, extractRecipeFromLinkHandler);
router.post("/", saveRecipeHandler);
// Also does an LLM call (macro estimation) — same limiter/reasoning as
// /extract above.
router.post("/:id/log", importLimiter, logSavedRecipeToMealHandler);

export default router;
