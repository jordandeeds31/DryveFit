import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useBlogPost, useDeleteBlogPost } from "@/hooks/useBlog";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const BlogPostScreen = () => {
  const { blogPostId } = useLocalSearchParams<{ blogPostId: string }>();
  const { data: post, isLoading, error } = useBlogPost(blogPostId ?? null);
  const { mutate: deleteBlogPost, isPending: isDeleting } = useDeleteBlogPost();
  const authImageHeaders = useAuthImageHeaders();

  const handleDelete = () => {
    if (!post) return;
    Alert.alert("Delete this post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteBlogPost(post.id, { onSuccess: safeGoBack });
        },
      },
    ]);
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
        {post?.isOwnPost && (
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Feather name="trash-2" size={20} color={colors.dangerRed} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && <ActivityIndicator style={{ flex: 1 }} />}

      {!isLoading && error && (
        <Text style={styles.errorText}>Couldn't load this post.</Text>
      )}

      {!isLoading && post && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {post.coverImageUrl && (
            <Image
              source={{ uri: post.coverImageUrl }}
              style={styles.coverImage}
              contentFit="cover"
            />
          )}
          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.authorRow}>
            {post.author.profileImageUrl && authImageHeaders ? (
              <Image
                source={{
                  uri: `${process.env.EXPO_PUBLIC_API_URL}${post.author.profileImageUrl}`,
                  headers: authImageHeaders,
                }}
                style={styles.authorAvatar}
              />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Feather name="user" size={16} color={colors.textSecondary} />
              </View>
            )}
            <Text style={styles.authorName}>
              {post.author.username ?? "DryveFit user"}
            </Text>
            <Text style={styles.authorDate}>{formatDate(post.createdAt)}</Text>
          </View>

          <Text style={styles.body}>{post.body}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default BlogPostScreen;

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
  errorText: {
    flex: 1,
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  coverImage: {
    width: "100%",
    aspectRatio: 1200 / 630,
    backgroundColor: colors.lightGraySoft,
  },
  title: {
    fontSize: fontSizes["2xl"],
    fontWeight: fontWeights.extrabold,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  authorAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.lightGraySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  authorName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  authorDate: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  body: {
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
});
