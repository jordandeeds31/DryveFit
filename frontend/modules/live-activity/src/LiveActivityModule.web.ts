import { LiveActivityModuleInterface } from "./LiveActivity.types";

// Live Activities are an iOS-only concept (ActivityKit) — not available
// on web.
const LiveActivityModule: LiveActivityModuleInterface = {
  isSupported: () => false,
  startActivity: async () => {},
  updateActivity: async () => {},
  endActivity: async () => {},
};

export default LiveActivityModule;
