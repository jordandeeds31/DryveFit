import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {},
  durationsContainer: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  durationButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  durationButtonSelected: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
  },
  duration: {
    fontWeight: fontWeights.semibold,
  },
  durationSelected: {
    fontWeight: fontWeights.semibold,
    color: "white",
  },
});

export default styles;
