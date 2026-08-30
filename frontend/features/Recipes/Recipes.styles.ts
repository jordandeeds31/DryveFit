import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  importSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  importStatusText: {
    fontSize: fontSizes.xs,
  },
  importStatusError: {
    color: colors.dangerRed,
  },
  importStatusInfo: {
    color: colors.textSecondary,
  },
  cardAttribution: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardThumbnailPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  errorState: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    marginBottom: spacing.md,
    borderRadius: 16,
    backgroundColor: "white",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: colors.lightGraySoft,
  },
  cardBody: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: 18,
  },
  // Detail modal
  detailImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 14,
    backgroundColor: colors.lightGraySoft,
    marginBottom: spacing.md,
  },
  detailMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  metaPillLink: {
    backgroundColor: colors.surfaceBlueLight,
  },
  metaPillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  metaPillTextLink: {
    color: colors.primaryBlue,
  },
  sectionHeading: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  ingredientImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  ingredientTextGroup: {
    flex: 1,
  },
  ingredientName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    textTransform: "capitalize",
  },
  ingredientAmount: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  ingredientPriceBadge: {
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  ingredientPrice: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  priceLoading: {
    marginVertical: spacing.sm,
  },
  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceBlueLight,
  },
  totalLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.primaryBlue,
    textAlign: "right",
  },
  totalPerServing: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  stepText: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 21,
  },
  savedIngredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  savedIngredientBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primaryBlue,
    marginTop: 8,
  },
  savedIngredientText: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  attributionText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
});
