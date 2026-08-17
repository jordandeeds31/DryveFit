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
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    padding: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
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
  loadingText: {
    padding: spacing.sm,
    color: colors.textSecondary,
  },
});

export default styles;
