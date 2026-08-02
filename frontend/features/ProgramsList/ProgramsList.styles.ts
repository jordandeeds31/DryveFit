import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  activeBadge: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
  },
  inactiveBadge: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
  },
  meta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  deleteButton: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
});

export default styles;
