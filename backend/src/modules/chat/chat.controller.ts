import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  listConversations,
  getConversationMessages,
  sendChatMessage,
  deleteConversation,
} from "./chat.service";

const getParam = (value: string | string[]): string => {
  return Array.isArray(value) ? value[0] : value;
};

export const listConversationsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const conversations = await listConversations(req.userId!);
    sendSuccess(res, 200, "CONVERSATIONS_FETCHED", { conversations });
  },
);

export const getConversationMessagesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const conversationId = getParam(req.params.conversationId);
    const messages = await getConversationMessages(
      req.userId!,
      conversationId,
    );
    sendSuccess(res, 200, "CONVERSATION_MESSAGES_FETCHED", { messages });
  },
);

export const sendChatMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { content, conversationId, isPro } = req.body;

    if (typeof content !== "string" || content.trim() === "") {
      throw new AppError(400, "content is required");
    }
    if (content.length > 2000) {
      throw new AppError(400, "content must be 2000 characters or fewer");
    }
    if (conversationId !== undefined && typeof conversationId !== "string") {
      throw new AppError(400, "conversationId must be a string");
    }

    // Fails closed on anything but a literal true — same philosophy as
    // subscriptionSlice's own fetchSubscriptionStatus.rejected handler
    // ("don't silently treat the user as pro").
    const result = await sendChatMessage(
      req.userId!,
      content.trim(),
      conversationId,
      isPro === true,
    );
    sendSuccess(res, 201, "CHAT_MESSAGE_SENT", result);
  },
);

export const deleteConversationHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const conversationId = getParam(req.params.conversationId);
    await deleteConversation(req.userId!, conversationId);
    sendSuccess(res, 200, "CONVERSATION_DELETED", {});
  },
);
