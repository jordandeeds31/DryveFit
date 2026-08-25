import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  levelRow: {
    flexDirection: "row",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
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
    fontSize: fontSizes.xs,
    fontWeight: "bold",
    color: colors.textSecondary,
  },
  levelTextSelected: {
    color: "white",
  },
});

export default styles;
