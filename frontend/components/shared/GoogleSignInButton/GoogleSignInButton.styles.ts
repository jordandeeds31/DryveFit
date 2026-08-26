import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    color: "#1a1a1a",
  },
  text: {
    color: "#1a1a1a",
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
