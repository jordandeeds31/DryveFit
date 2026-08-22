import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGrayLight,
  },
  content: {
    padding: spacing.sm,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGray,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headlineStat: {
    alignItems: "center",
    flex: 1,
  },
  headlineValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.primaryBlue,
  },
  headlineLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  metricLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  cooldownText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  instructions: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  photoButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
  },
  photoButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  photoPreviewWrapper: {
    marginBottom: spacing.sm,
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  removePhotoButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
  },
  formSection: {
    marginBottom: spacing.sm,
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
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
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
  heightRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  heightField: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  historyLoading: {
    marginTop: spacing.md,
  },
  historySection: {
    marginTop: spacing.xs,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  historyRowActive: {
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
  },
  historyDate: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  historyStat: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});

export default styles;
