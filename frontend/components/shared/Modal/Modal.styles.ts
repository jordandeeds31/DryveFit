import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  overlayTop: {
    justifyContent: "flex-start",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    width: "100%",
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  cardLarge: {
    maxHeight: "95%",
  },
  closeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
  },
  closeRowWithAction: {
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
});

export default styles;
