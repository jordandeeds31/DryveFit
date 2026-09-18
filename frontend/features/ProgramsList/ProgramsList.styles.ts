import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    gap: 2,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    fontStyle: "italic",
  },
  activeBadge: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
    backgroundColor: colors.completedGreenLight,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    overflow: "hidden",
  },
  inactiveBadge: {
    fontSize: 10,
    fontWeight: fontWeights.semibold,
    color: colors.textMuted,
    backgroundColor: colors.lightGraySoft,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    overflow: "hidden",
  },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  deleteButton: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    height: 28,
    paddingVertical: 0,
    paddingHorizontal: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSizes.xs,
  },
});

export default styles;
