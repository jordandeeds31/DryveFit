import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    width: "100%",
    maxHeight: "85%",
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
});

export default styles;
