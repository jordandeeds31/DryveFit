import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  findOrCreateOneOnOneConversation,
  listDmConversations,
  getDmMessages,
  sendDmMessage,
  markDmConversationRead,
} from "./messages.service";

export const listDmConversationsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const conversations = await listDmConversations(req.userId!);
    sendSuccess(res, 200, "DM_CONVERSATIONS_FETCHED", { conversations });
  },
);

export const createDmConversationHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { targetUserId } = req.body;

    if (typeof targetUserId !== "string") {
      throw new AppError(400, "targetUserId is required");
    }

    const conversation = await findOrCreateOneOnOneConversation(
      req.userId!,
      targetUserId,
    );
    // Just the id — the frontend only needs this to navigate to the
    // thread screen, and returning the raw Prisma row (participants and
    // all) here would leak internal shape for no reason.
    sendSuccess(res, 200, "DM_CONVERSATION_READY", {
      conversationId: conversation.id,
    });
  },
);

export const getDmMessagesHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    if (typeof conversationId !== "string") {
      throw new AppError(400, "conversationId is required");
    }

    const page = await getDmMessages(req.userId!, conversationId, cursor);
    sendSuccess(res, 200, "DM_MESSAGES_FETCHED", page);
  },
);

export const sendDmMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;
    // multipart/form-data (when an image is attached) puts non-file fields
    // in req.body same as JSON does — content is optional here since an
    // image-only message has none.
    const { content } = req.body;
    const file = req.file;

    if (typeof conversationId !== "string") {
      throw new AppError(400, "conversationId is required");
    }
    if (content !== undefined && typeof content !== "string") {
      throw new AppError(400, "content must be a string");
    }
    if (file && !file.mimetype.startsWith("image/")) {
      throw new AppError(400, "Attachment must be an image");
    }

    const message = await sendDmMessage(
      req.userId!,
      conversationId,
      content ?? "",
      file?.buffer ?? null,
    );
    sendSuccess(res, 201, "DM_MESSAGE_SENT", { message });
  },
);

export const markDmConversationReadHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { conversationId } = req.params;

    if (typeof conversationId !== "string") {
      throw new AppError(400, "conversationId is required");
    }

    await markDmConversationRead(req.userId!, conversationId);
    sendSuccess(res, 200, "DM_CONVERSATION_READ", { message: "Marked read" });
  },
);
