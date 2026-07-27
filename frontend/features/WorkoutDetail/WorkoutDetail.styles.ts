import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  focus: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  exerciseRow: {
    borderWidth: 1,
    borderColor: "black",
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  exerciseName: {
    fontWeight: fontWeights.semibold,
  },
  exerciseMeta: {
    fontSize: fontSizes.sm,
    color: "gray",
    marginBottom: spacing.xs,
  },
});

export default styles;
