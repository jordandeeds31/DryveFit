import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  focus: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  exerciseRow: {
    flexDirection: "row",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  exerciseContent: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  exerciseImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  exerciseName: {
    fontWeight: fontWeights.semibold,
  },
  exerciseMeta: {
    fontSize: fontSizes.sm,
    color: "gray",
    marginBottom: spacing.xs,
  },
  recommendedWeight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
    marginBottom: spacing.xs,
  },
  descriptionModalTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  descriptionModalBody: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  cardButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkPreviousButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
  },
  checkPreviousText: {
    fontSize: 11,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  previousSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  previousSetLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  previousSetValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
