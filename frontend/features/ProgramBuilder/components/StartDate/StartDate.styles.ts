import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    borderRadius: 8,
    backgroundColor: "white",
    paddingHorizontal: spacing.md,
    height: 44,
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  dateText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
