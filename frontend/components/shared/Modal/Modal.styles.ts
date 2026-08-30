import { StyleSheet } from "react-native";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";

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
  overlayWide: {
    padding: spacing.xs,
  },
  overlayBottom: {
    justifyContent: "flex-end",
    padding: 0,
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
  cardWide: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  cardBottom: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dragHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderGray,
    marginBottom: spacing.sm,
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
  closeRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  scrollArea: {
    flexGrow: 0,
    flexShrink: 1,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    alignItems: "center",
  },
});

export default styles;
