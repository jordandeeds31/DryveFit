import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {},
  sessionRow: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    width: "100%",
    flexDirection: "row",
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
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
