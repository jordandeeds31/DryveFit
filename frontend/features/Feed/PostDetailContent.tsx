import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  usePost,
  useComments,
  useToggleLike,
  useDeletePost,
  useAddComment,
} from "@/hooks/usePosts";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { PostComment } from "@/types/posts.types";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import CommentItem from "@/features/Feed/CommentItem";

const formatPostDate = (dateStr: string) =>
  formatCalendarDate(dateStr, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const findCommentById = (
  comments: PostComment[],
  id: string,
): PostComment | null => {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const found = findCommentById(comment.replies, id);
    if (found) return found;
  }
  return null;
};

const containsCommentId = (comments: PostComment[], id: string): boolean => {
  for (const comment of comments) {
    if (comment.id === id) return true;
    if (containsCommentId(comment.replies, id)) return true;
  }
  return false;
};

// A reply is nested arbitrarily deep inside its thread, not appended at the
// end of the FlatList's own `data` — so "scroll to it" really means "scroll
// to the top-level thread it landed in," found by walking the top-level
// comments and checking which one's subtree contains the reply target.
const findRootCommentId = (
  comments: PostComment[],
  targetId: string,
): string | null => {
  for (const root of comments) {
    if (root.id === targetId || containsCommentId(root.replies, targetId)) {
      return root.id;
    }
  }
  return null;
};

type ScrollTarget = { type: "end" } | { type: "comment"; rootId: string };

// Paused by default (not autoplaying/looping) — same reasoning as the
// feed's own video card.
const PostVideo = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri);

  return (
    <VideoView
      style={styles.postMedia}
      player={player}
      contentFit="cover"
      nativeControls
    />
  );
};

interface PostDetailContentProps {
  postId: string | null;
  // Arrives from a "X commented on your post" notification — see
  // notifications.tsx — so the reply box can open pre-selected on that
  // specific comment instead of leaving the viewer to find it themselves.
  initialReplyId?: string;
  onClose: () => void;
  // The full-screen route reads as "go back," the bottom-sheet modal reads
  // as "dismiss" — same handler either way, just a different affordance.
  closeIcon?: "chevron-left" | "chevron-down";
}

const PostDetailContent = ({
  postId,
  initialReplyId,
  onClose,
  closeIcon = "chevron-left",
}: PostDetailContentProps) => {
  const insets = useSafeAreaInsets();
  const authImageHeaders = useAuthImageHeaders();

  const { data: post, isLoading: isPostLoading } = usePost(postId);
  const { data: comments, isLoading: isCommentsLoading } =
    useComments(postId);
  const { mutate: toggleLike } = useToggleLike();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();
  const { mutate: addComment, isPending: isSending } = useAddComment();

  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  // Guards against re-applying the auto-selected reply target every time
  // `comments` refetches (e.g. after sending) — only the first match for
  // a given target id should trigger it.
  const appliedInitialReplyId = useRef<string | null>(null);

  const listRef = useRef<FlatList<PostComment>>(null);
  // Set right before an add-comment mutation fires, consumed once the
  // resulting `comments` refetch lands.
  const pendingScrollTargetRef = useRef<ScrollTarget | null>(null);

  useEffect(() => {
    if (!initialReplyId || !comments) return;
    if (appliedInitialReplyId.current === initialReplyId) return;

    const target = findCommentById(comments, initialReplyId);
    if (target) {
      setReplyingTo(target);
      appliedInitialReplyId.current = initialReplyId;
    }
  }, [comments, initialReplyId]);

  useEffect(() => {
    const target = pendingScrollTargetRef.current;
    if (!target || !comments) return;
    pendingScrollTargetRef.current = null;

    requestAnimationFrame(() => {
      if (target.type === "end") {
        listRef.current?.scrollToEnd({ animated: true });
        return;
      }
      const index = comments.findIndex(
        (c: PostComment) => c.id === target.rootId,
      );
      if (index === -1) {
        listRef.current?.scrollToEnd({ animated: true });
        return;
      }
      // viewPosition 0 pins the thread's top to the top of the visible
      // area (below the sticky header content) rather than centering it,
      // so a reply added at the bottom of a long thread is still likely
      // to land on screen instead of just the thread's start.
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });
    });
  }, [comments]);

  const handleDelete = () => {
    if (!post) return;
    Alert.alert("Delete this post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deletePost(post.id, {
            onSuccess: onClose,
          }),
      },
    ]);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !postId) return;

    const rootId =
      replyingTo && comments
        ? findRootCommentId(comments, replyingTo.id)
        : null;
    pendingScrollTargetRef.current = rootId
      ? { type: "comment", rootId }
      : { type: "end" };

    addComment(
      { postId, content: trimmed, parentId: replyingTo?.id },
      {
        onSuccess: () => {
          setText("");
          setReplyingTo(null);
        },
      },
    );
  };

  // Comments render at wildly different heights (nested reply threads of
  // arbitrary depth), so FlatList can't estimate an unmeasured target's
  // offset — scrollToIndex fails until enough items above it have actually
  // been laid out. Falling back to scrollToOffset with a rough per-item
  // estimate gets close enough to trigger the layout, then retrying
  // scrollToIndex lands precisely once it's measured.
  const handleScrollToIndexFailed = (info: {
    index: number;
    averageItemLength: number;
  }) => {
    listRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });
    setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0,
      });
    }, 100);
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onClose}
        >
          <Feather name={closeIcon} size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 26 }} />
      </View>

      {isPostLoading && <ActivityIndicator style={{ marginTop: spacing.xl }} />}

      {!isPostLoading && !post && (
        <Text style={styles.emptyText}>
          This post isn't available anymore.
        </Text>
      )}

      {!isPostLoading && post && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <FlatList
            ref={listRef}
            data={comments ?? []}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            ListHeaderComponent={
              <View style={styles.postSection}>
                <View style={styles.postHeader}>
                  {post.author.profileImageUrl && authImageHeaders ? (
                    <Image
                      source={{
                        uri: `${process.env.EXPO_PUBLIC_API_URL}${post.author.profileImageUrl}`,
                        headers: authImageHeaders,
                      }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Feather
                        name="user"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.postHeaderText}
                    disabled={post.isOwnPost}
                    onPress={() => {
                      onClose();
                      router.push(`/user/${post.author.id}`);
                    }}
                  >
                    <Text style={styles.username}>
                      {post.author.username ?? "Someone"}
                    </Text>
                    <Text style={styles.postDate}>
                      {formatPostDate(post.createdAt)}
                    </Text>
                  </TouchableOpacity>
                  {post.isOwnPost && (
                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={isDeleting}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={colors.dangerRed}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {post.caption && (
                  <Text style={styles.caption}>{post.caption}</Text>
                )}

                {/* Cloudinary URL — already absolute and publicly
                    servable, unlike profile pictures/exercise GIFs which
                    route through our own authenticated proxy, so no
                    base-URL prefix or auth header here. */}
                {post.mediaUrl && post.mediaType === "video" ? (
                  <PostVideo uri={post.mediaUrl} />
                ) : (
                  post.mediaUrl && (
                    <Image
                      source={{ uri: post.mediaUrl }}
                      style={styles.postMedia}
                      contentFit="cover"
                    />
                  )
                )}

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                      toggleLike({
                        postId: post.id,
                        isLiked: post.isLikedByViewer,
                      })
                    }
                  >
                    <Ionicons
                      name={post.isLikedByViewer ? "heart" : "heart-outline"}
                      size={18}
                      color={
                        post.isLikedByViewer
                          ? colors.dangerRed
                          : colors.textSecondary
                      }
                    />
                    <Text style={styles.actionText}>{post.likeCount}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionButton}>
                    <Feather
                      name="message-circle"
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.actionText}>
                      {post.commentCount}
                    </Text>
                  </View>
                </View>

                <Text style={styles.commentsHeading}>Comments</Text>
              </View>
            }
            renderItem={({ item }: { item: PostComment }) => (
              <CommentItem
                comment={item}
                postId={post.id}
                depth={0}
                onReply={setReplyingTo}
              />
            )}
            ListEmptyComponent={
              !isCommentsLoading ? (
                <Text style={styles.emptyText}>
                  No comments yet — be the first.
                </Text>
              ) : null
            }
            ListFooterComponent={
              isCommentsLoading ? (
                <ActivityIndicator style={{ marginTop: spacing.md }} />
              ) : null
            }
          />

          {replyingTo && (
            <View style={styles.replyingToRow}>
              <Text style={styles.replyingToText}>
                Replying to {replyingTo.author.username ?? "Someone"}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.commentInputRow,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <TextInput
              style={styles.commentInput}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.author.username ?? "Someone"}...`
                  : "Add a comment..."
              }
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || isSending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="send"
                size={20}
                color={text.trim() ? colors.primaryBlue : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </>
  );
};

export default PostDetailContent;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  postSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    marginBottom: spacing.sm,
    gap: spacing.sm,
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
  },
  postMedia: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  commentsHeading: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    marginTop: spacing.xs,
  },
  replyingToRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginHorizontal: spacing.md,
  },
  replyingToText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.semibold,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "white",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: fontSizes.sm,
    textAlignVertical: "top",
    maxHeight: 80,
  },
});
