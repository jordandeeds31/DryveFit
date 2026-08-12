import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  listConversationsHandler,
  getConversationMessagesHandler,
  sendChatMessageHandler,
  deleteConversationHandler,
} from "./chat.controller";

const router = Router();

router.use(authMiddleware);

router.get("/conversations", listConversationsHandler);
router.get("/conversations/:conversationId/messages", getConversationMessagesHandler);
router.delete("/conversations/:conversationId", deleteConversationHandler);
router.post("/messages", sendChatMessageHandler);

export default router;
