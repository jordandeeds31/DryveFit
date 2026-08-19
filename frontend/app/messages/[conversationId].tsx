import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import Feather from "@expo/vector-icons/Feather";
import type { RootState } from "@/store";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { useCurrentUser } from "@/hooks/useUsers";
import {
  useDmConversations,
  useDmThread,
  useSendDmMessage,
  useMarkDmConversationRead,
} from "@/hooks/useDirectMessages";
import { sendTyping } from "@/lib/messaging/websocketClient";
import { DmMessage } from "@/types/directMessages.types";
import MessageBubble from "@/features/DirectMessages/MessageBubble";
import TypingIndicator from "@/features/DirectMessages/TypingIndicator";
import ConnectionBanner from "@/features/DirectMessages/ConnectionBanner";

// How long after the last keystroke before a typing:stop is sent — resets
// on every keystroke, so this only actually fires once someone pauses.
const TYPING_STOP_DELAY_MS = 3000;

const ThreadScreen = () => {
  const { conversationId } = useLocalSearchParams<{
    conversationId: string;
  }>();
  const insets = useSafeAreaInsets();
  const authImageHeaders = useAuthImageHeaders();
  const { data: currentUser } = useCurrentUser();
  // The conversation list is already fetched globally (AppHeader's unread
  // badge keeps it warm), so this is usually an instant cache hit rather
  // than a fresh request — falls back to a generic title on the rare path
  // where it isn't (e.g. a deep link opened before the list ever loaded).
  const { data: conversations } = useDmConversations();
  const conversation = conversations?.find(
    (c: { id: string }) => c.id === conversationId,
  );

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDmThread(conversationId ?? null);
  const { mutate: send, isPending: isSending } = useSendDmMessage(
    conversationId ?? "",
  );
  const { mutate: markRead } = useMarkDmConversationRead();

  const typingUserIds = useSelector(
    (state: RootState) =>
      state.messaging.typingByConversation[conversationId ?? ""] ?? [],
  );

  const [text, setText] = useState("");
  const isTypingRef = useRef(false);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (conversationId) markRead(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (conversationId && isTypingRef.current) {
        sendTyping(conversationId, false);
      }
    };
  }, [conversationId]);

  const messages: DmMessage[] = data?.pages.flatMap((p) => p.messages) ?? [];

  const handleChangeText = (value: string) => {
    setText(value);
    if (!conversationId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(conversationId, true);
    }

    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }, TYPING_STOP_DELAY_MS);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;

    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }

    send(trimmed);
    setText("");
  };

  const isOtherUserTyping = typingUserIds.length > 0;

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
        <View style={styles.headerCenter}>
          {conversation?.otherUser?.profileImageUrl && authImageHeaders ? (
            <Image
              source={{
                uri: `${process.env.EXPO_PUBLIC_API_URL}${conversation.otherUser.profileImageUrl}`,
                headers: authImageHeaders,
              }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Feather name="user" size={12} color={colors.textSecondary} />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation?.otherUser?.username ?? "Conversation"}
          </Text>
        </View>
        <View style={{ width: 26 }} />
      </View>

      <ConnectionBanner />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.listContent}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwnMessage={item.senderId === currentUser?.id}
              />
            )}
            ListHeaderComponent={
              isOtherUserTyping ? <TypingIndicator /> : null
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator style={{ marginVertical: spacing.md }} />
              ) : null
            }
          />
        )}

        <View
          style={[
            styles.inputRow,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Message..."
            value={text}
            onChangeText={handleChangeText}
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
    </SafeAreaView>
  );
};

export default ThreadScreen;

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
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    justifyContent: "center",
  },
  headerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lightGraySoft,
  },
  headerAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "white",
  },
  input: {
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
