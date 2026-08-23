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
    maxHeight: 240,
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
  loadingText: {
    padding: spacing.sm,
    color: colors.textSecondary,
  },
  helperText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});

export default styles;
