import { getShareExtensionKey } from "expo-share-intent";

// Expo Router tries to match every incoming URL against a file-based
// route before anything else runs — including the internal signal URL
// the share extension uses to hand data back to the main app (something
// like dryve:///dataUrl=<key>), which isn't a real screen and was
// rendering as "Unmatched Route" instead of ever reaching
// useShareIntentContext(). This file is Expo Router's designated
// interception point for exactly that: redirect the share-intent URL to
// a real route (the root layout already listens for the share intent
// itself, so any real screen works) before Router's normal matching runs.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return "/";
    }
    return path;
  } catch {
    return "/";
  }
}
