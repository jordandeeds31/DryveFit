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
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  tabButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceBlueLight,
  },
  tabButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.primaryBlue,
  },
  importSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
  },
  importSectionInfo: {
    backgroundColor: colors.surfaceBlueLight,
  },
  importSectionError: {
    backgroundColor: "#FEF2F2",
  },
  importStatusText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  importStatusError: {
    color: colors.dangerRed,
  },
  importStatusInfo: {
    color: colors.textSecondary,
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
  discoverLoading: {
    marginTop: spacing.xl,
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
    marginBottom: spacing.sm,
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
  sectionHeadingTight: {
    marginTop: 0,
  },
  mealButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  mealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 72,
    minHeight: 28,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
  },
  mealButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  mealAddedText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
  // Review/edit modal
  reviewSaveButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  reviewSaveButtonText: {
    fontSize: fontSizes.sm,
  },
  fieldLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  editableIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  editableIngredientFields: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  editableQtyWrapper: {
    width: 56,
  },
  editableUnitWrapper: {
    width: 72,
  },
  editableNameWrapper: {
    flex: 1,
  },
  editableStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  // Deliberately not the shared bordered Input component here — these
  // steps read as flowing instruction text (like RecipeDetailModal's
  // read-only stepText above), just happening to be editable during
  // review, not a form field the eye should land on as a distinct box.
  editableStepInput: {
    flex: 1,
    fontSize: fontSizes.sm,
    lineHeight: 21,
    paddingTop: 2,
  },
  editableStepRemoveButton: {
    marginTop: spacing.xs,
  },
  addRowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  addRowText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
  },
  // Success modal
  successContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  successIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceBlueLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  successTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
  },
  successSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  successButtonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    alignSelf: "stretch",
  },
  successButton: {
    flex: 1,
  },
});
