import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router } from "expo-router";
import { updatePushToken } from "@/lib/api/users.api";

// Governs how a push is presented while the app is already open in the
// foreground — without this, iOS silently drops the banner/sound and the
// notification only ever shows up in Notification Center.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests permission (if not already granted/denied) and, once granted,
// registers this device's Expo push token + IANA timezone with the
// backend — used for the workout-reminder job as well as social pushes
// (post likes/comments). Safe to call on every app launch — re-sent each
// time so a token Expo rotates behind the scenes, or a timezone change
// from travel, stays current.
export const registerForPushNotifications = async (): Promise<void> => {
  // Expo push tokens aren't issued to simulators/emulators — only a real
  // device can receive an actual push.
  if (!Device.isDevice) return;

  // Runs on every authenticated app launch (see _layout.tsx) — a failure
  // here (denied permission, an older OS/device quirk, a flaky APNs
  // handshake, ...) is background plumbing the user never asked for and
  // has no way to act on, so it's logged rather than surfaced. This used
  // to Alert.alert on any failure for TestFlight visibility, but that
  // meant anyone who hit a real device-specific failure (e.g. an older
  // iPhone) got a blocking "Push notification setup failed" popup every
  // single time they opened the app — worse than the silent failure it
  // was meant to catch.
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn(
        "Push setup skipped: no EAS project ID found (Constants.expoConfig?.extra?.eas?.projectId is missing).",
      );
      return;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await updatePushToken({ expoPushToken, timezone });
  } catch (err) {
    console.warn("Push notification registration failed:", err);
  }
};

interface PushNotificationData {
  // Only set on a social push (post_like/post_comment/follow) or a DM
  // (dm_message) — a workout reminder's payload never carries this, which
  // is what tells the two apart below.
  type?: "post_like" | "post_comment" | "follow" | "dm_message";
  postId?: string;
  commentId?: string;
  actorId?: string;
  programId?: string;
  date?: string;
  conversationId?: string;
}

const handleNotificationTap = (response: Notifications.NotificationResponse) => {
  const data = response.notification.request.content
    .data as PushNotificationData;

  if (data?.type === "post_like" || data?.type === "post_comment") {
    if (!data.postId) return;
    // Same "reply to the specific comment" deep link the in-app
    // notifications screen uses for a comment tap — see notifications.tsx.
    const replyParam =
      data.type === "post_comment" && data.commentId
        ? `?replyTo=${data.commentId}`
        : "";
    router.push(`/post/${data.postId}${replyParam}`);
    return;
  }

  // A follow has no post to open — the only meaningful destination is
  // the new follower's own profile, same as the in-app notification row.
  if (data?.type === "follow") {
    if (!data.actorId) return;
    router.push(`/user/${data.actorId}`);
    return;
  }

  if (data?.type === "dm_message") {
    if (!data.conversationId) return;
    router.push(`/messages/${data.conversationId}`);
    return;
  }

  if (data?.programId && data?.date) {
    router.push({
      pathname: "/cinematic-mode",
      params: { programId: data.programId, date: data.date },
    });
  }
};

// Handles both ways a tap can reach the app: already running in the
// background/foreground (the listener), or launched fresh by the tap
// itself (the cold-start check). Returns an unsubscribe function.
export const setupNotificationTapHandling = (): (() => void) => {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handleNotificationTap(response);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationTap,
  );
  return () => subscription.remove();
};
