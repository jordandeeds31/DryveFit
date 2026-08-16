import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lightGray,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
  },
});

export default styles;
