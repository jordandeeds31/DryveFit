import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  datesContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  weekRange: {
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  container: {},
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
    fontWeight: fontWeights.semibold,
  },
  date: {
    fontWeight: fontWeights.semibold,
  },
  dateSelected: {
    color: colors.primaryBlue,
  },
});

export default styles;
