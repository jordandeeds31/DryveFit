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
    flex: 1,
    marginRight: spacing.sm,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  focusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryBlue,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  startButtonText: {
    color: "white",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  focusActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  revertButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  revertButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
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
  enlargedImage: {
    width: "100%",
    height: 320,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  exerciseIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  exerciseName: {
    flex: 1,
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
  addExerciseButton: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 8,
    borderStyle: "dashed",
  },
  addExerciseText: {
    color: colors.primaryBlue,
    fontWeight: fontWeights.semibold,
  },
  addExerciseFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addExerciseFieldLabel: {
    width: 70,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  addExerciseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: fontSizes.sm,
  },
  addExerciseSubmitButton: {
    marginTop: spacing.md,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  addExerciseSubmitButtonDisabled: {
    backgroundColor: colors.borderGray,
  },
  addExerciseSubmitText: {
    color: "white",
    fontWeight: fontWeights.bold,
  },
});

export default styles;
