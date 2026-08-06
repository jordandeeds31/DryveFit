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
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  programFormContainer: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  section: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 14,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  lastSection: {},
  buildButton: {
    width: "100%",
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  errorText: {
    color: colors.dangerRed,
    textAlign: "center",
  },
});

export default styles;
