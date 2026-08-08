import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  getChatHistory,
  sendChatMessage,
  clearChatHistory,
} from "./chat.service";

export const getChatHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const messages = await getChatHistory(req.userId!);
    sendSuccess(res, 200, "CHAT_HISTORY_FETCHED", { messages });
  },
);

export const sendChatMessageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { content } = req.body;

    if (typeof content !== "string" || content.trim() === "") {
      throw new AppError(400, "content is required");
    }
    if (content.length > 2000) {
      throw new AppError(400, "content must be 2000 characters or fewer");
    }

    const message = await sendChatMessage(req.userId!, content.trim());
    sendSuccess(res, 201, "CHAT_MESSAGE_SENT", { message });
  },
);

export const clearChatHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await clearChatHistory(req.userId!);
    sendSuccess(res, 200, "CHAT_HISTORY_CLEARED", {});
  },
);
