import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

export default StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    backgroundColor: "white",
  },
  genderTabBar: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 10,
    padding: 3,
    marginTop: spacing.sm,
  },
  genderTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  genderTabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  genderTabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  genderTabTextActive: {
    color: "#000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.extrabold,
    color: colors.textSecondary,
    letterSpacing: 6,
  },
  rule: {
    width: 32,
    height: 2,
    backgroundColor: colors.borderGray,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 260,
  },
  eyebrow: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    letterSpacing: 3,
    marginTop: spacing.lg,
  },
});
