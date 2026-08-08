import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getChatHistoryHandler,
  sendChatMessageHandler,
  clearChatHistoryHandler,
} from "./chat.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getChatHistoryHandler);
router.post("/", sendChatMessageHandler);
router.delete("/", clearChatHistoryHandler);

export default router;
