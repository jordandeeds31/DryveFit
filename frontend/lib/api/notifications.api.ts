import apiClient from "./client";
import { NotificationsPage } from "@/types/notifications.types";

export const getNotifications = async (
  cursor?: string,
): Promise<NotificationsPage> => {
  const { data } = await apiClient.get("/api/notifications", {
    params: cursor ? { cursor } : undefined,
  });
  return data.result;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const { data } = await apiClient.get("/api/notifications/unread-count");
  return data.result.count;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.post("/api/notifications/mark-read");
};
