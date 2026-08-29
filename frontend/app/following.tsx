import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { useFollowing, useSetNotifyOnNewPost } from "@/hooks/useUsers";
import { FollowedUser } from "@/types/user.types";

const MAX_NOTIFY_ON_NEW_POST = 5;

const FollowingScreen = () => {
  const { data: following, isLoading } = useFollowing();
  const { mutate: setNotifyOnNewPost, isPending } = useSetNotifyOnNewPost();
  const authImageHeaders = useAuthImageHeaders();

  const users = following ?? [];
  const notifyCount = users.filter((user) => user.notifyOnNewPost).length;

  const handleToggleNotify = (user: FollowedUser) => {
    setNotifyOnNewPost(
      { userId: user.id, enabled: !user.notifyOnNewPost },
      {
        onError: (error: unknown) => {
          const message =
            (error as { message?: string })?.message ?? "Please try again.";
          Alert.alert("Couldn't update notifications", message);
        },
      },
    );
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
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.subheader}>
        Turn on notifications for up to {MAX_NOTIFY_ON_NEW_POST} people —
        you'll get a push when they post to the Feed or publish a blog post.
        {"  "}
        <Text style={styles.subheaderCount}>
          {notifyCount}/{MAX_NOTIFY_ON_NEW_POST} on
        </Text>
      </Text>

      {isLoading && <ActivityIndicator style={{ marginTop: spacing.xl }} />}

      {!isLoading && users.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="users" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            You're not following anyone yet
          </Text>
        </View>
      )}

      {!isLoading && users.length > 0 && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowMain}
                onPress={() => router.push(`/user/${item.id}`)}
              >
                {item.profileImageUrl && authImageHeaders ? (
                  <Image
                    source={{
                      uri: `${process.env.EXPO_PUBLIC_API_URL}${item.profileImageUrl}`,
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
                <Text style={styles.username}>{item.username}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.notifyButton,
                  item.notifyOnNewPost && styles.notifyButtonActive,
                ]}
                hitSlop={8}
                disabled={isPending}
                onPress={() => handleToggleNotify(item)}
              >
                <Ionicons
                  name={
                    item.notifyOnNewPost
                      ? "notifications"
                      : "notifications-outline"
                  }
                  size={18}
                  color={
                    item.notifyOnNewPost
                      ? colors.primaryBlue
                      : colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default FollowingScreen;

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
  subheader: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  subheaderCount: {
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
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
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  username: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  notifyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  notifyButtonActive: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
});
