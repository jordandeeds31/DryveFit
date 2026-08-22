import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  primaryText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  secondaryText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
    opacity: 0.8,
  },
});

export default styles;
