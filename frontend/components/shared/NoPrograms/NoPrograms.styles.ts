import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    width: "100%",
  },
  title: {
    textAlign: "center",
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
  },
  text: {
    textAlign: "center",
    width: "80%",
  },
});

export default styles;
