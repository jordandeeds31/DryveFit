import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
} from "./notifications.service";

export const getNotificationsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const result = await getNotifications(req.userId!, cursor);
    sendSuccess(res, 200, "NOTIFICATIONS_FETCHED", result);
  },
);

export const getUnreadCountHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getUnreadCount(req.userId!);
    sendSuccess(res, 200, "UNREAD_COUNT_FETCHED", result);
  },
);

export const markAllReadHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await markAllNotificationsRead(req.userId!);
    sendSuccess(res, 200, "NOTIFICATIONS_READ", { message: "Marked read" });
  },
);
