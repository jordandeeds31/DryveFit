import { StyleSheet } from "react-native";
import { fontSizes, fontWeights } from "@/constants/typography";
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
    gap: spacing.md,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  cancelButton: {
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGray,
    flex: 1,
  },
  cancel: {
    fontWeight: fontWeights.semibold,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
});

export default styles;
