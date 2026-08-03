import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primaryBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.primaryBlue,
  },
  text: {
    color: "white",
    fontWeight: fontWeights.semibold,
  },
  textOutline: {
    color: colors.primaryBlue,
  },
});

export default styles;
