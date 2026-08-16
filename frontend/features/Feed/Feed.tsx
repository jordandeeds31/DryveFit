import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFeed, useDeletePost, useToggleLike } from "@/hooks/usePosts";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { colors } from "@/constants/colors";
import { Post } from "@/types/posts.types";
import Toast from "@/components/shared/Toast/Toast";
import CreatePostModal from "./CreatePostModal";
import styles from "./Feed.styles";

const formatPostDate = (dateStr: string) =>
  formatCalendarDate(dateStr, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// Paused by default (not autoplaying/looping) — a feed can have many of
// these mounted at once via FlatList, so nothing here starts pulling data
// or playing until the viewer actually taps play.
const FeedVideo = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri);

  return (
    <VideoView
      style={styles.postImage}
      player={player}
      contentFit="cover"
      nativeControls
    />
  );
};

const Feed = () => {
  const authImageHeaders = useAuthImageHeaders();
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useFeed();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: toggleLike } = useToggleLike();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Deliberately not react-query's own isRefetching — that flips true for
  // ANY background refetch (posting, deleting, liking), which would flash
  // this spinner for reasons that have nothing to do with a manual pull.
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  };

  const posts: Post[] = data?.pages.flatMap((page) => page.posts) ?? [];

  const handleDelete = (post: Post) => {
    Alert.alert("Delete this post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deletePost(post.id, {
            onSuccess: () => setToastMessage("Post deleted"),
          }),
      },
    ]);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        {item.author.profileImageUrl && authImageHeaders ? (
          <Image
            source={{
              uri: `${process.env.EXPO_PUBLIC_API_URL}${item.author.profileImageUrl}`,
              headers: authImageHeaders,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={14} color={colors.textSecondary} />
          </View>
        )}
        <TouchableOpacity
          style={styles.postHeaderText}
          disabled={item.isOwnPost}
          onPress={() => router.push(`/user/${item.author.id}`)}
        >
          <Text style={styles.username}>
            {item.author.username ?? "Someone"}
          </Text>
          <Text style={styles.postDate}>{formatPostDate(item.createdAt)}</Text>
        </TouchableOpacity>
        {item.isOwnPost && (
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Feather name="trash-2" size={16} color={colors.dangerRed} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        {item.caption && <Text style={styles.caption}>{item.caption}</Text>}

        {/* Cloudinary URL — already absolute and publicly servable,
            unlike profile pictures/exercise GIFs which route through our
            own authenticated proxy, so no base-URL prefix or auth header
            here. */}
        {item.mediaUrl && item.mediaType === "video" ? (
          <FeedVideo uri={item.mediaUrl} />
        ) : (
          item.mediaUrl && (
            <Image
              source={{ uri: item.mediaUrl }}
              style={styles.postImage}
              contentFit="cover"
            />
          )
        )}
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            toggleLike({ postId: item.id, isLiked: item.isLikedByViewer })
          }
        >
          <Ionicons
            name={item.isLikedByViewer ? "heart" : "heart-outline"}
            size={18}
            color={
              item.isLikedByViewer ? colors.dangerRed : colors.textSecondary
            }
          />
          <Text style={styles.actionText}>{item.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/post/${item.id}`)}
        >
          <Feather
            name="message-circle"
            size={18}
            color={colors.textSecondary}
          />
          <Text style={styles.actionText}>{item.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          style={styles.newPostButton}
          onPress={() => setIsCreateOpen(true)}
        >
          <Feather name="plus" size={16} color="white" />
          <Text style={styles.newPostButtonText}>New Post</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          refreshing={isManualRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No posts yet — be the first to share something.
            </Text>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
        />
      )}

      <CreatePostModal
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPosted={setToastMessage}
      />

      <Toast
        visible={!!toastMessage}
        message={toastMessage ?? ""}
        onHide={() => setToastMessage(null)}
      />
    </View>
  );
};

export default Feed;
