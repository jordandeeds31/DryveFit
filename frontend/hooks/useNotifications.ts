import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/api/notifications.api";

// Short enough that a new like shows up in the bell badge within seconds
// of it happening, without needing a websocket/push round-trip to do it.
const UNREAD_COUNT_POLL_INTERVAL_MS = 15000;

export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: UNREAD_COUNT_POLL_INTERVAL_MS,
  });
};

export const useNotifications = () => {
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => getNotifications(),
  });
};

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
