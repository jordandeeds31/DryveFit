import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {},
  levelRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceGray,
    borderRadius: 12,
    gap: 4,
  },
  levelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  levelButtonSelected: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  levelText: {
    fontWeight: "bold",
    color: colors.textSecondary,
  },
  levelTextSelected: {
    color: "white",
  },
});

export default styles;
