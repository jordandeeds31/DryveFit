import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { PRO_ENTITLEMENT_ID } from "./purchases";

// Shows the RevenueCat paywall only if the user doesn't already have the
// "pro" entitlement (presentPaywallIfNeeded checks that internally).
// Resolves true if the caller should proceed with the gated action —
// either they already had access, or they just purchased/restored it.
export const ensureProAccess = async (): Promise<boolean> => {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
  });

  return (
    result === PAYWALL_RESULT.NOT_PRESENTED ||
    result === PAYWALL_RESULT.PURCHASED ||
    result === PAYWALL_RESULT.RESTORED
  );
};
