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
    marginBottom: spacing.sm,
  },
  headerRowEnd: {
    justifyContent: "flex-end",
  },
  voiceTipBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  voiceTipBannerText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  exerciseBlock: {
    marginTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  // The rule's whole point is separating one exercise from the next — the
  // last one has nothing below it to separate from.
  exerciseBlockLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  exerciseBlockHeader: {
    flexDirection: "row",
    // Was "center" — fine when DropdownExerciseSelect was just a single
    // input row, but it now always shows its body-part chips underneath
    // too, so centering against that taller block dropped the remove (X)
    // button down to the chips' height instead of the input's.
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  dropdownWrapper: {
    flex: 1,
  },
  removeExerciseButton: {
    // Centers the icon within the 44px-tall input row specifically,
    // now that the header row is top-aligned rather than centered
    // against the whole (input + chips) block.
    marginTop: (44 - 20) / 2,
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
  saveReminder: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  checkPreviousButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 6,
  },
  checkPreviousText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  previousSessionDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
    marginBottom: spacing.sm,
  },
  previousSetValue: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
