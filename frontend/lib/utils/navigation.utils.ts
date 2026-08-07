import { router } from "expo-router";

// router.back() throws/warns ("GO_BACK not handled") if the screen ever
// ends up as the root of the navigation stack with no history to pop —
// e.g. a full reload while the screen happened to be open during
// development, or any other case where it wasn't reached via a normal
// push. Falling back to the home tab keeps a back button always working
// regardless of how the screen was entered.
export const safeGoBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(tabs)");
  }
};
