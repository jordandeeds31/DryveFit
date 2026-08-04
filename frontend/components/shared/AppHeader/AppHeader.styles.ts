import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

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
  },
});

export default styles;
