import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 56,
    height: 56,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  settingsButton: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGray,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dangerRed,
    borderWidth: 1,
    borderColor: "white",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  createButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
  },
});

export default styles;
