import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heightRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heightField: {
    flex: 1,
  },
  heightFieldLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fieldErrorText: {
    color: colors.dangerRed,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
  stackedOptions: {
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
  },
  stackedOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
  },
  optionActive: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
  optionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primaryBlue,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dateText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  errorText: {
    color: colors.dangerRed,
    fontSize: fontSizes.sm,
    marginTop: spacing.md,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});

export default styles;
