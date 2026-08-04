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
    borderColor: colors.borderGray,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  dateText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
