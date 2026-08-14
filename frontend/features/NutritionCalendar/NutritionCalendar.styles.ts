import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  datesContainer: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
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
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.xs,
  },
  dateButtonSelected: {
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  todayDotContainer: {
    height: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primaryBlue,
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
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
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
