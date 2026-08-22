import { LiveActivityModuleInterface } from "./LiveActivity.types";

// Live Activities are an iOS-only concept (ActivityKit) — this module has
// no Android native implementation (see expo-module.config.json's
// platforms: ["apple"]), so every call here is a safe no-op rather than
// letting requireNativeModule throw on a platform it was never built for.
const LiveActivityModule: LiveActivityModuleInterface = {
  isSupported: () => false,
  startActivity: async () => {},
  updateActivity: async () => {},
  endActivity: async () => {},
};

export default LiveActivityModule;
