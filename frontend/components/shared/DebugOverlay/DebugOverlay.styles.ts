import { Platform, StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  // Deliberately small and low-contrast (not the app's primary blue) so it
  // reads as a debug affordance, not a real feature, while still being easy
  // to find on a TestFlight build with no other way to see what's wrong.
  fab: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.xxl,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.dangerRed,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: fontWeights.bold,
  },
  // The modal card itself is white (components/shared/Modal), so the
  // console content gets its own dark "terminal" surface rather than
  // relying on the card background.
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  title: {
    color: "white",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  emptyText: {
    backgroundColor: "#111",
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    padding: spacing.md,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  list: {
    backgroundColor: "#111",
    maxHeight: 480,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  entry: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  entryTime: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: fontWeights.semibold,
  },
  entryMessage: {
    color: "#39FF14",
    fontSize: fontSizes.xs,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
});

export default styles;
