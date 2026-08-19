import { Text } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import styles from "./ConnectionBanner.styles";

// Only shown while actively reconnecting — "connecting" (the very first
// connect attempt) and "closed" (logged out, or intentionally backgrounded
// per _layout.tsx's AppState handling) aren't failure states worth
// interrupting the thread screen for.
const ConnectionBanner = () => {
  const status = useSelector((state: RootState) => state.messaging.status);

  if (status !== "reconnecting") return null;

  return <Text style={styles.banner}>Reconnecting…</Text>;
};

export default ConnectionBanner;
