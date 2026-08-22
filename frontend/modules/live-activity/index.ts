import { Platform } from "react-native";
import NativeLiveActivityModule from "./src/LiveActivityModule";
import { LiveActivityContentStateInput } from "./src/LiveActivity.types";

export * from "./src/LiveActivity.types";

// Extra Platform.OS guard on top of the per-platform module resolution
// (LiveActivityModule.ios.ts vs .android.ts vs .web.ts) — same
// belt-and-suspenders pattern as lib/health/healthkit.ts's
// isHealthKitAvailable, since a runtime check here is cheap and this is
// exactly the kind of thing that's expensive to get wrong silently.
export const isLiveActivitySupported = (): boolean =>
  Platform.OS === "ios" && NativeLiveActivityModule.isSupported();

export const startCardioLiveActivity = (
  activityType: string,
  startedAtMs: number,
): Promise<void> => NativeLiveActivityModule.startActivity(activityType, startedAtMs);

export const updateCardioLiveActivity = (
  state: LiveActivityContentStateInput,
): Promise<void> => NativeLiveActivityModule.updateActivity(state);

export const endCardioLiveActivity = (): Promise<void> =>
  NativeLiveActivityModule.endActivity();
