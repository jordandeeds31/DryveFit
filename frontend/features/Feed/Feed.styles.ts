import { StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { spacing } from "@/constants/spacing";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  newPostButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  gridContent: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xl,
  },
  gridRow: {
    gap: 2,
  },
  gridCell: {
    flex: 1 / 3,
    aspectRatio: 1,
    marginBottom: 2,
  },
  gridCellImage: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.lightGraySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellVideoIcon: {
    // Video posts have no extracted thumbnail frame to show (would need a
    // separate thumbnail-generation step) — a plain play icon over the
    // placeholder background is enough to distinguish it from a photo at
    // a glance, without instantiating a real video player per grid cell.
    opacity: 0.9,
  },
  postCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  postHeaderText: {
    flex: 1,
  },
  username: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  postDate: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.sm,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  actionText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  commentRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightGraySoft,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBody: {
    flex: 1,
  },
  commentUsername: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  commentContent: {
    fontSize: fontSizes.sm,
  },
  commentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
  },
  commentActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commentActionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  commentReplyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: fontWeights.bold,
  },
  repliesContainer: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  postSubmitButton: {
    backgroundColor: colors.primaryBlue,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  postSubmitButtonDisabled: {
    opacity: 0.4,
  },
  postSubmitButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    minHeight: 80,
    textAlignVertical: "top",
  },
  attachImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  attachImageText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
  },
  imagePreviewWrapper: {
    marginTop: spacing.md,
  },
  imagePreview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default styles;
