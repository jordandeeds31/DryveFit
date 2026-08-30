import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { router, Href } from "expo-router";
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
  // Only set on a social push (post_like/post_comment/comment_reply/follow/
  // new_post/new_blog_post) or a DM (dm_message) — a workout reminder's
  // payload never carries this, which is what tells the two apart below.
  type?:
    | "post_like"
    | "post_comment"
    | "comment_reply"
    | "follow"
    | "new_post"
    | "new_blog_post"
    | "dm_message"
    | "daily_analysis";
  postId?: string;
  blogPostId?: string;
  commentId?: string;
  actorId?: string;
  programId?: string;
  date?: string;
  conversationId?: string;
  // Set on the "you don't have a program yet" reminder and the streak
  // notification — the other non-social pushes besides the workout
  // reminder above, which carries programId/date instead since it
  // deep-links to a specific day.
  screen?: "programs" | "personal-record-progress";
}

// Pure mapping from a tapped notification's payload to where it should
// land — shared by the warm-tap listener below and by index.tsx's
// cold-start redirect, which needs the target route without navigating
// itself (see consumePendingNotificationRoute).
const getRouteForNotification = (
  response: Notifications.NotificationResponse,
): Href | null => {
  const data = response.notification.request.content
    .data as PushNotificationData;

  if (
    data?.type === "post_like" ||
    data?.type === "post_comment" ||
    data?.type === "comment_reply" ||
    data?.type === "new_post"
  ) {
    if (!data.postId) return null;
    // Same "reply to the specific comment" deep link the in-app
    // notifications screen uses for a comment tap — see notifications.tsx.
    const replyParam =
      (data.type === "post_comment" || data.type === "comment_reply") &&
      data.commentId
        ? `?replyTo=${data.commentId}`
        : "";
    return `/post/${data.postId}${replyParam}` as Href;
  }

  if (data?.type === "new_blog_post") {
    if (!data.blogPostId) return null;
    return `/blog/${data.blogPostId}` as Href;
  }

  // A follow has no post to open — the only meaningful destination is
  // the new follower's own profile, same as the in-app notification row.
  if (data?.type === "follow") {
    if (!data.actorId) return null;
    return `/user/${data.actorId}` as Href;
  }

  if (data?.type === "dm_message") {
    if (!data.conversationId) return null;
    return `/messages/${data.conversationId}` as Href;
  }

  // The analysis for this date was already computed and persisted by the
  // job that sent this push (see dailyProgressNotifications.ts) — the
  // Nutrition tab just needs the date to fetch and auto-open it, not
  // re-run anything.
  if (data?.type === "daily_analysis") {
    if (!data.date) return null;
    return {
      pathname: "/(tabs)/Nutrition",
      params: { dailyAnalysisDate: data.date },
    } as Href;
  }

  if (data?.programId && data?.date) {
    return {
      pathname: "/cinematic-mode",
      params: { programId: data.programId, date: data.date },
    } as Href;
  }

  if (data?.screen === "programs") {
    return "/(tabs)/Programs" as Href;
  }

  if (data?.screen === "personal-record-progress") {
    return "/(tabs)/PersonalRecordProgress" as Href;
  }

  return null;
};

const handleNotificationTap = (response: Notifications.NotificationResponse) => {
  const route = getRouteForNotification(response);
  if (route) router.push(route);
};

// Handles a tap while the app is already running (foreground/background,
// process alive) — a real cold launch never fires this listener, only
// getLastNotificationResponseAsync below, so there's no overlap between
// the two. Returns an unsubscribe function.
export const setupNotificationTapHandling = (): (() => void) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationTap,
  );
  return () => subscription.remove();
};

// The cold-launch case is intentionally NOT handled by an imperative
// router.push the way the warm-tap listener above is — on a fresh launch
// (e.g. tapping a DM push from the Lock Screen), app/index.tsx's own
// auth-check <Redirect> to "/(tabs)" or "/(auth)/signin" resolves
// concurrently and, whichever settles second, silently overwrites the
// other's navigation. Instead index.tsx calls this to learn the intended
// destination BEFORE it ever decides where to redirect, so there's only
// ever one redirect instead of two racing.
export const consumePendingNotificationRoute = async (): Promise<Href | null> => {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return getRouteForNotification(response);
};
