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
import { useDmConversations } from "@/hooks/useDirectMessages";
import { DmConversationListItem } from "@/types/directMessages.types";

// Same reasoning as notifications.tsx's formatRelativeTime — createdAt/
// updatedAt here are real UTC instants, not the app's "local midnight"
// calendar-day fields, so this is intentionally not timezone-forced.
const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const MessagesScreen = () => {
  const { data: conversations, isLoading } = useDmConversations();
  const authImageHeaders = useAuthImageHeaders();

  const openThread = (item: DmConversationListItem) => {
    router.push(`/messages/${item.id}`);
  };

  const list = conversations ?? [];

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
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading && <ActivityIndicator style={{ marginTop: spacing.xl }} />}

      {!isLoading && list.length === 0 && (
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No conversations yet</Text>
        </View>
      )}

      {!isLoading && list.length > 0 && (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const hasUnread = item.unreadCount > 0;
            return (
              <TouchableOpacity
                style={[styles.row, hasUnread && styles.rowUnread]}
                onPress={() => openThread(item)}
              >
                {item.otherUser?.profileImageUrl && authImageHeaders ? (
                  <Image
                    source={{
                      uri: `${process.env.EXPO_PUBLIC_API_URL}${item.otherUser.profileImageUrl}`,
                      headers: authImageHeaders,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="user" size={16} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.username}>
                    {item.otherUser?.username ?? "Someone"}
                  </Text>
                  {item.lastMessage && (
                    <Text
                      style={styles.lastMessage}
                      numberOfLines={1}
                    >
                      {item.lastMessage.isOwnMessage ? "You: " : ""}
                      {item.lastMessage.content}
                    </Text>
                  )}
                </View>
                <View style={styles.rowMeta}>
                  {item.lastMessage && (
                    <Text style={styles.time}>
                      {formatRelativeTime(item.lastMessage.createdAt)}
                    </Text>
                  )}
                  {hasUnread && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountBadgeText}>
                        {item.unreadCount > 9 ? "9+" : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default MessagesScreen;

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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  username: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: "#000",
  },
  lastMessage: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  rowMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  time: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  unreadCountBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadCountBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: "white",
  },
});
