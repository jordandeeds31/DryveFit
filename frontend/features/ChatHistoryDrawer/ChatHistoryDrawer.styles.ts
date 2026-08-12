import { Dimensions, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

export const DRAWER_WIDTH = Dimensions.get("window").width * 0.9;

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: "100%",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    backgroundColor: colors.surfaceGrayLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowTextGroup: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  rowDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});

export default styles;
