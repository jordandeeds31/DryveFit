import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authMiddleware, AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  listDmConversationsHandler,
  createDmConversationHandler,
  getDmMessagesHandler,
  sendDmMessageHandler,
  markDmConversationReadHandler,
} from "./messages.controller";

// Same memoryStorage + error-wrapping approach as posts.routes.ts's
// uploadMediaMiddleware — a DM attachment is a photo, not a video, so a
// much smaller cap than posts' 50MB is plenty.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadImageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("image")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError(
            413,
            "That image is too large — try a smaller photo (10MB max).",
          ),
        );
      }
      return next(new AppError(400, err.message));
    }
    next(err instanceof Error ? new AppError(400, err.message) : err);
  });
};

const router = Router();

router.use(authMiddleware);

// First real usage of express-rate-limit in this backend (installed but
// previously unused everywhere else). Keyed by req.userId, not IP — mobile
// clients sit behind carrier-grade NAT and can share an IP across many
// unrelated users, and this also sidesteps needing `app.set("trust
// proxy", ...)` for X-Forwarded-For handling behind Render's proxy, which
// isn't configured anywhere in this app today.
//
// req.ip is only ever the fallback here — authMiddleware runs first for
// this whole router, so userId should always be set — but
// express-rate-limit validates the key generator at startup and throws
// (not just warns) if it sees a raw IP anywhere in it, since a bare IPv6
// address is too granular to rate-limit by (one device/network can rotate
// through a huge address space within its own /64 block, bypassing a
// naive per-address limit). Routing even the unreachable fallback through
// their own ipKeyGenerator satisfies that check — this was crashing the
// whole process at require-time (see the stack trace: thrown while
// loading this very route module), which explains real production 502s,
// not just a benign log line.
const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as AuthRequest).userId ?? ipKeyGenerator(req.ip ?? "unknown"),
});

router.get("/conversations", listDmConversationsHandler);
router.post("/conversations", createDmConversationHandler);
router.get("/conversations/:conversationId/messages", getDmMessagesHandler);
router.post(
  "/conversations/:conversationId/messages",
  sendMessageLimiter,
  uploadImageMiddleware,
  sendDmMessageHandler,
);
router.patch("/conversations/:conversationId/read", markDmConversationReadHandler);

export default router;
