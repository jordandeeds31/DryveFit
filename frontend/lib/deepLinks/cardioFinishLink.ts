import * as Linking from "expo-linking";
import { router } from "expo-router";

// Expo Router's automatic file-based URL matching is what handles most
// deep links in this app (see pushNotifications.ts's comment on that
// convention) — but a fullScreenModal-presented route like cardio-session
// being the very FIRST thing to render on a cold launch (e.g. tapping the
// Live Activity's Finish button after iOS has suspended/killed the app)
// isn't reliably presenting the modal on top of the tab navigator; the
// tab navigator's default tab renders instead and the URL's query param
// never reaches the screen. Handling this explicitly with an imperative
// router.push mirrors the proven pattern pushNotifications.ts already
// uses for notification taps, rather than relying on automatic matching
// for this one modal route.
const handleUrl = (url: string) => {
  const { hostname, path, queryParams } = Linking.parse(url);
  const routeSegment = hostname ?? path;
  if (routeSegment === "cardio-session" && queryParams?.action === "finish") {
    router.push({ pathname: "/cardio-session", params: { action: "finish" } });
  }
};

// Handles both ways a deep link can reach the app: already running
// (the listener) or launched fresh by the link itself (the cold-start
// check) — same two-path shape as pushNotifications.ts's
// setupNotificationTapHandling. Returns an unsubscribe function.
export const setupCardioFinishDeepLinkHandling = (): (() => void) => {
  Linking.getInitialURL().then((url) => {
    if (url) handleUrl(url);
  });

  const subscription = Linking.addEventListener("url", ({ url }) => handleUrl(url));
  return () => subscription.remove();
};
