import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGrayLight,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
  },
  writePostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    // Matches the shared TextInput's own container height (40, see
    // TextInput.styles.ts) so the button lines up with it rather than
    // looking mismatched next to a taller/shorter box.
    height: 40,
  },
  writePostButtonText: {
    color: "white",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  // Editorial-style row — a colored accent bar instead of a boxed border,
  // separated by a bottom divider rather than card shadows/gaps, since the
  // rest of the app (Feed, Leaderboard) already uses the bordered-white-card
  // look and this is deliberately meant to read differently.
  card: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    gap: spacing.sm,
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sourcePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sourcePillText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    textTransform: "uppercase",
  },
  timestamp: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  coverThumbnail: {
    width: "100%",
    aspectRatio: 1200 / 630,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    lineHeight: fontSizes.lg * 1.25,
  },
  summary: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: fontSizes.sm * 1.4,
  },
  highlight: {
    backgroundColor: colors.primaryBlue + "33",
    color: colors.primaryBlue,
    fontWeight: fontWeights.bold,
  },
});

export default styles;
