import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { PRO_ENTITLEMENT_ID } from "./purchases";
import { queryClient } from "@/lib/api/queryClient";
import { getCurrentUser } from "@/lib/api/users.api";

// jordandeeds31@gmail.com mirrors backend/src/utils/futureLogGuard.ts's
// UNRESTRICTED_TEST_EMAIL — the developer's own account, exempted from
// paywalls the same way it's exempted from other normally-enforced
// restrictions. Other addresses here are comped accounts.
const UNRESTRICTED_EMAILS = [
  "jordandeeds31@gmail.com",
  "pineapplecrafty@gmail.com",
  "andrew@getbettrhealth.com",
  "cgfitt.nutrition@gmail.com",
];

// Shows the RevenueCat paywall only if the user doesn't already have the
// "pro" entitlement (presentPaywallIfNeeded checks that internally).
// Resolves true if the caller should proceed with the gated action —
// either they already had access, or they just purchased/restored it.
export const ensureProAccess = async (): Promise<boolean> => {
  // ensureQueryData (not getQueryData) so this works even when nothing has
  // populated the ["currentUser"] cache yet — e.g. tapping a gated action
  // on Home before ever visiting Profile/Leaderboard/Cardio, the only
  // screens that otherwise trigger this fetch.
  try {
    const currentUser = await queryClient.ensureQueryData({
      queryKey: ["currentUser"],
      queryFn: getCurrentUser,
    });
    // Case-insensitive — emails aren't guaranteed to be stored in
    // whatever exact casing someone happens to type/compare here.
    if (
      currentUser?.email &&
      UNRESTRICTED_EMAILS.some(
        (email) => email.toLowerCase() === currentUser.email.toLowerCase(),
      )
    )
      return true;
  } catch {
    // Falls through to the normal paywall — this check should never be
    // what blocks a real user from getting to purchase.
  }

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
  });

  return (
    result === PAYWALL_RESULT.NOT_PRESENTED ||
    result === PAYWALL_RESULT.PURCHASED ||
    result === PAYWALL_RESULT.RESTORED
  );
};
