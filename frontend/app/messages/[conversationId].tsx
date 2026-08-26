import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
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
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
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

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to attach a photo to this message.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;
    setPickedImageUri(result.assets[0].uri);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !pickedImageUri) || !conversationId) return;

    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(conversationId, false);
    }

    send({ content: trimmed, imageUri: pickedImageUri ?? undefined });
    setText("");
    setPickedImageUri(null);
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
        <TouchableOpacity
          style={styles.headerCenter}
          disabled={!conversation?.otherUser}
          onPress={() => router.push(`/user/${conversation!.otherUser!.id}`)}
        >
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
        </TouchableOpacity>
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
          <TouchableOpacity
            onPress={handlePickImage}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="image" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            {pickedImageUri && (
              <View style={styles.inlineImageWrapper}>
                <Image
                  source={{ uri: pickedImageUri }}
                  style={styles.inlineImagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setPickedImageUri(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={12} color="white" />
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Message..."
              value={text}
              onChangeText={handleChangeText}
              multiline
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!text.trim() && !pickedImageUri) || isSending}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="send"
              size={20}
              color={
                text.trim() || pickedImageUri
                  ? colors.primaryBlue
                  : colors.textMuted
              }
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
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: "white",
  },
  // Wraps the thumbnail + TextInput together inside one bordered pill —
  // the attachment lives INSIDE the input field (iMessage/WhatsApp-style),
  // not as a separate bar stacked above the whole input row. Column, not
  // row: the thumbnail sits on its own line above the text, which then
  // wraps below it full-width rather than squeezing in beside it.
  inputContainer: {
    flex: 1,
    flexDirection: "column",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    // Same inset the TextInput used on its own before it moved in here —
    // this pill needs to look identical to the original input when
    // there's no attachment, only growing/changing for the image case.
    paddingHorizontal: spacing.sm,
  },
  inlineImageWrapper: {
    width: 56,
    // Default alignItems ("stretch") would otherwise force this to the
    // container's full width since it's the lone item on its row.
    alignSelf: "flex-start",
    marginTop: 6,
  },
  inlineImagePreview: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.borderGray,
  },
  removeImageButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 10,
    fontSize: fontSizes.sm,
    textAlignVertical: "center",
    maxHeight: 80,
  },
});
