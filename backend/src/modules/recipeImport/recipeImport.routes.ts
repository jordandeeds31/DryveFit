import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authMiddleware, AuthRequest } from "../../middleware/authMiddleware";
import {
  importRecipeFromLinkHandler,
  getSavedRecipesHandler,
} from "./recipeImport.controller";

const router = Router();

router.use(authMiddleware);

// Each import does a platform fetch plus an LLM call — meaningfully more
// expensive than a typical write, so a tighter cap than messages.routes.ts's
// send-message limiter. Same per-user (IP fallback) key pattern.
const importLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as AuthRequest).userId ?? ipKeyGenerator(req.ip ?? "unknown"),
});

router.get("/", getSavedRecipesHandler);
router.post("/import", importLimiter, importRecipeFromLinkHandler);

export default router;
