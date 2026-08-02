import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  optionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
  },
  optionButtonSelected: {
    backgroundColor: colors.primaryBlue,
  },
  optionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  optionTextSelected: {
    color: "white",
  },
});

export default styles;
