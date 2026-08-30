import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  submitButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    minHeight: 160,
    marginTop: spacing.md,
  },
  attachCoverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  attachCoverText: {
    color: colors.primaryBlue,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  coverPreviewWrapper: {
    marginTop: spacing.md,
  },
  coverPreview: {
    width: "100%",
    aspectRatio: 1200 / 630,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  removeCoverButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default styles;
