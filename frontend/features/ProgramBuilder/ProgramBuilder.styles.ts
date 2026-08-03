import { StyleSheet } from "react-native";
import { fontWeights } from "@/constants/typography";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  programFormContainer: {
    flexDirection: "column",
  },
  section: {
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  lastSection: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottomWidth: 0,
  },
  buildButton: {
    width: "100%",
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
});

export default styles;
