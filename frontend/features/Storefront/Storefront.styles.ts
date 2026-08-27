import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

export default StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    backgroundColor: "white",
  },
  // flexGrow (not flex) on the content container — lets short content
  // (the empty "coming soon" state) still center vertically, while tall
  // content (the product card) scrolls normally instead of being forced
  // to fit/center within the fixed space below genderTabBar, which is
  // what let it visually overlap the tab bar above it.
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
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
    alignItems: "center",
  },
  productContent: {
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  productCard: {
    width: "100%",
    maxWidth: 320,
    aspectRatio: 0.82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderGray,
    overflow: "hidden",
    backgroundColor: colors.surfaceGrayLight,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  productBadgeText: {
    color: "white",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1,
  },
  productName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    marginTop: spacing.md,
  },
  productSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    maxWidth: 260,
  },
  interestButton: {
    marginTop: spacing.lg,
    minWidth: 220,
  },
  interestTally: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  interestTallyCount: {
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
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
