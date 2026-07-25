import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    backgroundColor: "white",
    marginTop: spacing.xs,
    maxHeight: 200,
    overflow: "hidden",
  },
  list: {
    maxHeight: 200,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  itemText: {
    fontWeight: fontWeights.semibold,
    fontSize: fontSizes.md,
    color: "#000",
  },
  itemTextSelected: {
    color: colors.primaryBlue,
    fontWeight: "600",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: colors.primaryBlue,
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default styles;
