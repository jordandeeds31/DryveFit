import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  datesContainer: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  monthLabel: {
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.md,
    color: colors.primaryBlue,
  },
  datesRow: {
    flexDirection: "row",
  },
  dateButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateButtonSelected: {
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 23,
  },
  dayLabel: {
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xs,
  },
  date: {
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.sm,
  },
  dateSelected: {
    color: colors.primaryBlue,
    fontWeight: fontWeights.extrabold,
    fontSize: fontSizes.xl,
  },
  indicatorContainer: {
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loggedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.completedGreen,
    marginTop: 2,
  },
  noEntryDash: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default styles;
