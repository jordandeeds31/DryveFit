import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  text: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
