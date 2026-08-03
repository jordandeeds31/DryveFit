import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontWeights, fontSizes } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  recommendedWeight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
    marginBottom: spacing.sm,
  },
  completionHint: {
    fontSize: fontSizes.xs,
    color: colors.pendingAmber,
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  setLabel: {
    width: 50,
    fontSize: 14,
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  deleteText: {
    fontSize: 16,
    paddingHorizontal: 6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center", // ensures they align vertically regardless of height differences
  },
  addSetButton: {
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 8,
    // marginTop removed — buttonRow's gap now handles spacing above this row instead
  },
  addSetText: {
    color: colors.primaryBlue,
    fontWeight: fontWeights.semibold,
  },
  addSetButtonInRow: {
    flex: 1,
  },
  saveReminder: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
});

export default styles;
