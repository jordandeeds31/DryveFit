import { StyleSheet } from "react-native";
import { fontSizes, fontWeights } from "@/constants/typography";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xs,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  programFormContainer: {
    flexDirection: "column",
    gap: spacing.xs,
  },
  section: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  lastSection: {},
  buildButton: {
    width: "100%",
    height: 46,
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
