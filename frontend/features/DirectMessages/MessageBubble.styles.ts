import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes } from "@/constants/typography";

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
    maxWidth: "78%",
  },
  rowOwn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  rowOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  bubbleOwn: {
    backgroundColor: colors.primaryBlue,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.lightGraySoft,
    borderBottomLeftRadius: 4,
  },
  bubblePending: {
    opacity: 0.6,
  },
  textOwn: {
    fontSize: fontSizes.sm,
    color: "white",
  },
  textOther: {
    fontSize: fontSizes.sm,
    color: "#000",
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    marginHorizontal: 4,
  },
});

export default styles;
