import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, AuthRequest } from "../../middleware/authMiddleware";
import {
  listDmConversationsHandler,
  createDmConversationHandler,
  getDmMessagesHandler,
  sendDmMessageHandler,
  markDmConversationReadHandler,
} from "./messages.controller";

const router = Router();

router.use(authMiddleware);

// First real usage of express-rate-limit in this backend (installed but
// previously unused everywhere else). Keyed by req.userId, not IP — mobile
// clients sit behind carrier-grade NAT and can share an IP across many
// unrelated users, and this also sidesteps needing `app.set("trust
// proxy", ...)` for X-Forwarded-For handling behind Render's proxy, which
// isn't configured anywhere in this app today.
const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as AuthRequest).userId ?? req.ip ?? "unknown",
});

router.get("/conversations", listDmConversationsHandler);
router.post("/conversations", createDmConversationHandler);
router.get("/conversations/:conversationId/messages", getDmMessagesHandler);
router.post(
  "/conversations/:conversationId/messages",
  sendMessageLimiter,
  sendDmMessageHandler,
);
router.patch("/conversations/:conversationId/read", markDmConversationReadHandler);

export default router;
