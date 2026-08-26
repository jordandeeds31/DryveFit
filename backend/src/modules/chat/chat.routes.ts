import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  listConversationsHandler,
  getConversationMessagesHandler,
  sendChatMessageHandler,
  deleteConversationHandler,
  transcribeAudioHandler,
} from "./chat.controller";

// Same memoryStorage + error-wrapping approach as posts.routes.ts's
// uploadMediaMiddleware — a voice message is a short clip, so a much
// smaller cap than posts' 50MB (Whisper itself caps at 25MB anyway).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadAudioMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("audio")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError(413, "That recording is too long — try a shorter one."),
        );
      }
      return next(new AppError(400, err.message));
    }
    next(err instanceof Error ? new AppError(400, err.message) : err);
  });
};

const router = Router();

router.use(authMiddleware);

router.get("/conversations", listConversationsHandler);
router.get("/conversations/:conversationId/messages", getConversationMessagesHandler);
router.delete("/conversations/:conversationId", deleteConversationHandler);
router.post("/messages", sendChatMessageHandler);
router.post("/transcribe", uploadAudioMiddleware, transcribeAudioHandler);

export default router;
