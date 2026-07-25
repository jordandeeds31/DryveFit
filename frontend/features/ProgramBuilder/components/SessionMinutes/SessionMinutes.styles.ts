import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  sessionRow: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    width: "100%",
    flexDirection: "row",
  },
  sessionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  sessionButtonSelected: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  session: {
    fontWeight: fontWeights.semibold,
  },
  sessionSelected: {
    fontWeight: fontWeights.semibold,
    color: "white",
  },
});

export default styles;
