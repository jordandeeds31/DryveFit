import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  banner: {
    textAlign: "center",
    backgroundColor: colors.pendingAmber,
    color: "white",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
});

export default styles;
