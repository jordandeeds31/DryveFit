import { Alert, Platform } from "react-native";
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
// backend's workout-reminder job. Safe to call on every app launch —
// re-sent each time so a token Expo rotates behind the scenes, or a
// timezone change from travel, stays current.
export const registerForWorkoutReminders = async (): Promise<void> => {
  // Expo push tokens aren't issued to simulators/emulators — only a real
  // device can receive an actual push.
  if (!Device.isDevice) return;

  // Every step from here on can throw in ways that are otherwise
  // completely invisible on a TestFlight build (no Metro, no attached
  // debugger) — surfaced as an alert rather than silently swallowed, so a
  // failure is at least visible on the device itself.
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
      Alert.alert(
        "Push setup issue",
        "No EAS project ID found (Constants.expoConfig?.extra?.eas?.projectId is missing).",
      );
      return;
    }

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    await updatePushToken({ expoPushToken, timezone });
  } catch (err) {
    Alert.alert(
      "Push notification setup failed",
      err instanceof Error ? err.message : String(err),
    );
  }
};

interface WorkoutReminderData {
  programId?: string;
  date?: string;
}

const openWorkoutFromNotification = (response: Notifications.NotificationResponse) => {
  const data = response.notification.request.content.data as WorkoutReminderData;
  if (!data?.programId || !data?.date) return;

  router.push({
    pathname: "/cinematic-mode",
    params: { programId: data.programId, date: data.date },
  });
};

// Handles both ways a tap can reach the app: already running in the
// background/foreground (the listener), or launched fresh by the tap
// itself (the cold-start check). Returns an unsubscribe function.
export const setupWorkoutReminderTapHandling = (): (() => void) => {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) openWorkoutFromNotification(response);
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(
    openWorkoutFromNotification,
  );
  return () => subscription.remove();
};
