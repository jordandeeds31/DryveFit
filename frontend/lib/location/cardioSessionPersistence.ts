import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActiveCardioSession } from "@/store/slices/cardioSessionSlice";

// Redux itself is purely in-memory (no redux-persist) — fine for a brief
// background suspension, but iOS can fully terminate a backgrounded app
// under memory pressure even while its background-location task keeps
// running, which would otherwise wipe out the whole in-progress session.
// This snapshot is what cardio-session.tsx reloads on mount to rebuild
// `active` when Redux itself comes back empty after a relaunch.
const SESSION_SNAPSHOT_KEY = "cardioSession.activeSnapshot";

export const saveSessionSnapshot = async (
  session: ActiveCardioSession,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to persist cardio session snapshot:", err);
  }
};

export const loadSessionSnapshot =
  async (): Promise<ActiveCardioSession | null> => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_SNAPSHOT_KEY);
      return raw ? (JSON.parse(raw) as ActiveCardioSession) : null;
    } catch (err) {
      console.warn("Failed to load cardio session snapshot:", err);
      return null;
    }
  };

export const clearSessionSnapshot = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_SNAPSHOT_KEY);
};
