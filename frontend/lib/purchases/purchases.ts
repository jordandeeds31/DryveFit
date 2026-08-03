import { Platform } from "react-native";
import Purchases from "react-native-purchases";

// The entitlement identifier configured in the RevenueCat dashboard.
export const PRO_ENTITLEMENT_ID = "pro";

let isConfigured = false;

// Initializes the RevenueCat SDK once per app session. Safe to call
// multiple times — only the first call actually configures the SDK.
export const configurePurchases = () => {
  if (isConfigured) return;

  if (Platform.OS !== "ios") {
    console.warn(
      "RevenueCat: no API key configured for this platform yet — purchases disabled.",
    );
    return;
  }

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  if (!apiKey) {
    console.warn(
      "EXPO_PUBLIC_REVENUECAT_API_KEY_IOS is not set — purchases disabled.",
    );
    return;
  }

  Purchases.configure({ apiKey });
  isConfigured = true;
};
