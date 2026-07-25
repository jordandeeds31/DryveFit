import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderGray,
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    paddingRight: spacing.xl,
  },
  input: {
    height: 40,
    width: "100%",
    paddingLeft: spacing.sm,
  },
  label: {
    marginBottom: spacing.sm,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});

export default styles;
