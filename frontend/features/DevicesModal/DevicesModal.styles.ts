import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  rowTextGroup: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  rowSubtext: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  comingSoonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
  },
});

export default styles;
