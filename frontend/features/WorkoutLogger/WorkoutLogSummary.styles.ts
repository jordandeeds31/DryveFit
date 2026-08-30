import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.xs,
  },
  shareButton: {
    padding: spacing.xs,
  },
  exerciseBlock: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  // Applied to every exercise block except the first — the calendar above
  // this list already ends with its own marginBottom, so giving the first
  // block a matching marginTop doubled up into a much bigger gap than
  // between any other two blocks.
  exerciseBlockSpaced: {
    marginTop: spacing.md,
  },
  exerciseBlockRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  exerciseTextGroup: {
    flex: 1,
  },
  exerciseImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  exerciseImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  exerciseImageLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  exerciseImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  setLabel: {
    width: 50,
    fontSize: 14,
    color: colors.textSecondary,
  },
  setValue: {
    fontSize: 14,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
