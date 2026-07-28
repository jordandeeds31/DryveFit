import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginBottom: spacing.md,
  },
  exerciseBlock: {
    marginTop: spacing.md,
    // paddingBottom: spacing.md,
    // borderBottomWidth: 1,
    // borderBottomColor: colors.borderGray,
  },
  exerciseBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dropdownWrapper: {
    flex: 1,
  },
  setsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
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
  addSetButton: {
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 8,
  },
  addSetText: {
    color: colors.primaryBlue,
    fontWeight: fontWeights.semibold,
  },
  addExerciseButton: {
    marginTop: spacing.md,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 8,
    borderStyle: "dashed",
    flex: 1,
  },
  addExerciseText: {
    color: colors.primaryBlue,
    fontWeight: fontWeights.semibold,
  },
  addExerciseSaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});

export default styles;
