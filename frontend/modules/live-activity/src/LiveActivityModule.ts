import { LiveActivityModuleInterface } from "./LiveActivity.types";

// Generic fallback only — Metro always prefers LiveActivityModule.ios.ts /
// .android.ts / .web.ts over this unsuffixed file at runtime on those
// platforms. This file exists purely so `tsc --noEmit` (which, unlike
// Metro, doesn't resolve platform-suffixed imports) has something to
// resolve `./LiveActivityModule` to.
const LiveActivityModule: LiveActivityModuleInterface = {
  isSupported: () => false,
  startActivity: async () => {},
  updateActivity: async () => {},
  endActivity: async () => {},
};

export default LiveActivityModule;
