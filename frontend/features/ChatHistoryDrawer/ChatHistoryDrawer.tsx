import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { useConversations, useDeleteConversation } from "@/hooks/useChat";
import { Conversation } from "@/types/chat.types";
import styles, { DRAWER_WIDTH } from "./ChatHistoryDrawer.styles";
import { ChatHistoryDrawerProps } from "./ChatHistoryDrawer.types";

const formatRelativeDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const ChatHistoryDrawer = ({
  visible,
  onClose,
  onSelectConversation,
}: ChatHistoryDrawerProps) => {
  const { data: conversations, isLoading } = useConversations();
  const { mutate: removeConversation } = useDeleteConversation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Stays mounted through the close animation, then unmounts — matches
  // the enter/exit pattern in components/shared/Toast/Toast.tsx.
  const [isMounted, setIsMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIsMounted(false);
      });
    }
  }, [visible, translateX, backdropOpacity]);

  if (!isMounted) return null;

  const handleDelete = (conversation: Conversation) => {
    Alert.alert(
      "Delete this chat?",
      `"${conversation.title}" will be permanently deleted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeletingId(conversation.id);
            removeConversation(conversation.id, {
              onSettled: () => setDeletingId(null),
            });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX }] }]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom", "left"]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chats</Text>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ flex: 1 }} color={colors.primaryBlue} />
          ) : !conversations || conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather
                name="message-circle"
                size={28}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No previous chats</Text>
              <Text style={styles.emptySubtitle}>
                Chats you start will show up here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onSelectConversation(item.id)}
                  disabled={deletingId === item.id}
                >
                  <View style={styles.rowTextGroup}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowDate}>
                      {formatRelativeDate(item.updatedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    <Feather name="trash-2" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

export default ChatHistoryDrawer;
