import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {},
  selectedDaysContainer: {
    flexDirection: "row",
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    width: "100%",
  },
  dayButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  dayButtonSelected: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  day: {
    fontWeight: fontWeights.semibold,
  },
  daySelected: {
    fontWeight: fontWeights.semibold,
    color: "white",
  },
});

export default styles;
