import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import {
  useNotifications,
  useMarkNotificationsRead,
} from "@/hooks/useNotifications";
import { AppNotification } from "@/types/notifications.types";

// createdAt is a real UTC instant (unlike the app's "local midnight"
// calendar-day fields), so parsing it with `new Date` and reading local
// getters back out is correct here, not a timezone bug.
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const notificationText = (notification: AppNotification): string => {
  switch (notification.type) {
    case "post_like":
      return "liked your post";
    case "post_comment":
      return "commented on your post";
    case "comment_reply":
      return "replied to your comment";
    case "follow":
      return "started following you";
    case "new_post":
      return "posted something new";
    case "new_blog_post":
      return "published a new post";
    default:
      return "";
  }
};

const NotificationsScreen = () => {
  const { data, isLoading } = useNotifications();
  const { mutate: markAllRead } = useMarkNotificationsRead();
  const authImageHeaders = useAuthImageHeaders();

  // Opening this screen is the read receipt — same convention as most
  // notification inboxes. Fires once per mount, not per notification tap.
  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifications = data?.notifications ?? [];

  const goToActorProfile = (item: AppNotification) => {
    router.push(`/user/${item.actor.id}`);
  };

  // Tapping the post preview (image/caption) opens the standalone post
  // screen — same "name goes to profile, content goes to the post" split
  // used everywhere else a post shows up (Feed, a profile's Social tab).
  // A comment notification also carries which comment to reply to. A
  // follow notification has no post at all, so the row's only meaningful
  // destination is the follower's own profile. A blog-post notification
  // routes to the blog post's own detail screen instead.
  const handleRowPress = (item: AppNotification) => {
    if (item.blogPost) {
      router.push(`/blog/${item.blogPost.id}`);
      return;
    }
    if (!item.post) {
      goToActorProfile(item);
      return;
    }
    const replyParam =
      (item.type === "post_comment" || item.type === "comment_reply") &&
      item.commentId
        ? `?replyTo=${item.commentId}`
        : "";
    router.push(`/post/${item.post.id}${replyParam}`);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={safeGoBack}
        >
          <Feather name="chevron-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: spacing.xl }} />}

      {!isLoading && notifications.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="bell" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}

      {!isLoading && notifications.length > 0 && (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, !item.isRead && styles.rowUnread]}
              onPress={() => handleRowPress(item)}
            >
              <TouchableOpacity onPress={() => goToActorProfile(item)}>
                {item.actor.profileImageUrl && authImageHeaders ? (
                  <Image
                    source={{
                      uri: `${process.env.EXPO_PUBLIC_API_URL}${item.actor.profileImageUrl}`,
                      headers: authImageHeaders,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather
                      name="user"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.rowText}>
                <Text style={styles.rowMessage}>
                  <Text
                    style={styles.actorName}
                    onPress={() => goToActorProfile(item)}
                  >
                    {item.actor.displayName}
                  </Text>{" "}
                  {notificationText(item)}
                </Text>
                <Text style={styles.rowTime}>
                  {formatRelativeTime(item.createdAt)}
                </Text>
              </View>
              {item.post?.mediaUrl && item.post.mediaType === "image" ? (
                <Image
                  source={{ uri: item.post.mediaUrl }}
                  style={styles.postThumbnail}
                />
              ) : item.post?.mediaUrl && item.post.mediaType === "video" ? (
                <View style={styles.postThumbnailPlaceholder}>
                  <Feather name="video" size={16} color={colors.textSecondary} />
                </View>
              ) : item.post?.caption ? (
                <View style={styles.postCaptionPreview}>
                  <Text style={styles.postCaptionText} numberOfLines={2}>
                    "{item.post.caption}"
                  </Text>
                </View>
              ) : item.blogPost?.coverImageUrl ? (
                <Image
                  source={{ uri: item.blogPost.coverImageUrl }}
                  style={styles.postThumbnail}
                />
              ) : item.blogPost ? (
                <View style={styles.postCaptionPreview}>
                  <Text style={styles.postCaptionText} numberOfLines={2}>
                    {item.blogPost.title}
                  </Text>
                </View>
              ) : null}
              {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  rowUnread: {
    backgroundColor: colors.surfaceBlueLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowMessage: {
    fontSize: fontSizes.sm,
    color: "#000",
  },
  actorName: {
    fontWeight: fontWeights.bold,
  },
  rowTime: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryBlue,
  },
  postThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.lightGraySoft,
  },
  postThumbnailPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  postCaptionPreview: {
    width: 72,
  },
  postCaptionText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "right",
  },
});
