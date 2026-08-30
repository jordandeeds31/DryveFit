import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.md,
  },
  inputSelected: {
    fontWeight: fontWeights.semibold,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    maxHeight: 320,
    backgroundColor: "white",
  },
  // Floats the results above whatever's below it (e.g. a graph grid)
  // instead of the default inline behavior, which pushes that content
  // down as the list grows. zIndex for iOS/JS layout, elevation for
  // Android's separate compositing order.
  dropdownOverlay: {
    position: "absolute",
    // Percentage, not a fixed pixel value — categoryRow (now always
    // visible above this, not nested inside it) wraps to a variable
    // number of lines, so this needs to land right below however tall
    // inputRow + categoryRow actually rendered, not a guessed constant.
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    padding: spacing.xs,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
  categoryChipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.primaryBlue,
  },
  list: {
    maxHeight: 240,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  itemSelected: {
    backgroundColor: colors.surfaceBlueLight,
  },
  itemTextGroup: {
    flex: 1,
  },
  itemName: {
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.md,
  },
  itemMeta: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  doneButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    backgroundColor: colors.surfaceGrayLight,
  },
  doneButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  loadingText: {
    padding: spacing.sm,
    color: colors.textSecondary,
  },
});

export default styles;
