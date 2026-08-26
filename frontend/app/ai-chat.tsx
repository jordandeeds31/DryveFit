import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { RootState } from "@/store";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import {
  useConversations,
  useConversationMessages,
  useSendChatMessage,
  useTranscribeAudio,
} from "@/hooks/useChat";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { ChatRole } from "@/types/chat.types";
import ChatHistoryDrawer from "@/features/ChatHistoryDrawer/ChatHistoryDrawer";

const SUGGESTIONS = [
  "How's my squat progressing?",
  "What are my current personal records?",
  "Summarize my last week of workouts",
];

type DisplayItem =
  | { id: string; kind: "message"; role: ChatRole; content: string }
  | { id: "typing"; kind: "typing" };

const AiChatScreen = () => {
  // undefined = a fresh, not-yet-started chat. Moves to a freshly-created
  // id after the first message, or to whatever's picked in the history
  // drawer — both handled locally so switching chats never needs a
  // navigation round-trip.
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(
    null,
  );
  // Runs exactly once per mount — defaults into the most recently active
  // chat rather than always opening blank. Stays false after that so it
  // never fights "New chat" or a manual pick from the history drawer.
  const [isResolvingInitialChat, setIsResolvingInitialChat] = useState(true);

  const { data: conversations } = useConversations();
  const { data: messages, isLoading: isLoadingMessages } =
    useConversationMessages(activeConversationId);
  const { mutate: sendMessage, isPending: isSending } = useSendChatMessage();
  const { mutate: transcribeAudio, isPending: isTranscribing } =
    useTranscribeAudio();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const isPro = useSelector((state: RootState) => state.subscription.isPro);

  useEffect(() => {
    if (!isResolvingInitialChat || conversations === undefined) return;
    if (conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
    setIsResolvingInitialChat(false);
  }, [isResolvingInitialChat, conversations]);

  const handleSend = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setDraft("");
    setOptimisticMessage(trimmed);

    sendMessage(
      { content: trimmed, conversationId: activeConversationId, isPro },
      {
        onSuccess: (data) => {
          setOptimisticMessage(null);
          setActiveConversationId(data.conversationId);
        },
        onError: (error: any) => {
          setOptimisticMessage(null);
          // 429 = the daily chat-message cap (chat.service.ts) — "please
          // try again" would be misleading here, since retrying
          // immediately won't help.
          if (error?.status === 429) {
            Alert.alert("Chat limit reached", error.message);
            return;
          }
          Alert.alert("Couldn't send message", "Please try again.");
        },
      },
    );
  };

  const handleMicPress = async () => {
    if (isRecording) {
      const uri = await stopRecording();
      if (!uri) return;

      transcribeAudio(uri, {
        onSuccess: (text) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          // Appends rather than replaces — lets someone type part of a
          // message, dictate the rest, and keep going either way.
          setDraft((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed));
        },
        onError: () => {
          Alert.alert(
            "Couldn't transcribe that",
            "Please try recording again.",
          );
        },
      });
      return;
    }

    await startRecording();
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setOptimisticMessage(null);
    setDraft("");
  };

  // FlatList is inverted (newest at the bottom, list scrolls "up" from
  // there) — history comes back oldest-first from the API, so it's
  // reversed here, with the in-flight optimistic message and typing
  // indicator prepended since they're the newest items.
  const items: DisplayItem[] = [];
  if (isSending) items.push({ id: "typing", kind: "typing" });
  if (optimisticMessage != null) {
    items.push({
      id: "optimistic",
      kind: "message",
      role: "user",
      content: optimisticMessage,
    });
  }
  for (let i = (messages?.length ?? 0) - 1; i >= 0; i--) {
    const message = messages![i];
    items.push({
      id: message.id,
      kind: "message",
      role: message.role,
      content: message.content,
    });
  }

  const isLoadingHistory =
    isResolvingInitialChat || (!!activeConversationId && isLoadingMessages);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={safeGoBack}
          >
            <Feather name="chevron-left" size={26} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => setIsHistoryVisible(true)}
          >
            <Feather name="menu" size={22} color="#000" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>DryveFit AI Coach</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleNewChat}
        >
          <Feather name="edit-3" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {isLoadingHistory ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.primaryBlue} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Ask me about your training</Text>
            <Text style={styles.emptySubtitle}>
              I can look up your real workouts, lifts, and cardio to answer.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            data={items}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) =>
              item.kind === "typing" ? (
                <View style={[styles.bubble, styles.assistantBubble]}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                </View>
              ) : (
                <View
                  style={[
                    styles.bubble,
                    item.role === "user"
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={
                      item.role === "user"
                        ? styles.userText
                        : styles.assistantText
                    }
                  >
                    {item.content}
                  </Text>
                </View>
              )
            }
          />
        )}

        <View style={styles.inputRow}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
            ]}
            onPress={handleMicPress}
            disabled={isTranscribing || isSending}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Feather
                name={isRecording ? "square" : "mic"}
                size={18}
                color={isRecording ? "white" : colors.textSecondary}
              />
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={
              isRecording ? "Listening..." : "Ask about your training..."
            }
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!draft.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend(draft)}
            disabled={!draft.trim() || isSending}
          >
            <Feather name="arrow-up" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ChatHistoryDrawer
        visible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        onSelectConversation={(conversationId) => {
          setActiveConversationId(conversationId);
          setIsHistoryVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

export default AiChatScreen;

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
    position: "relative",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    pointerEvents: "none",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  suggestions: {
    gap: spacing.sm,
    width: "100%",
  },
  suggestionChip: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  suggestionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: 2,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primaryBlue,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: "white",
    fontSize: fontSizes.md,
  },
  assistantText: {
    color: "#000",
    fontSize: fontSizes.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonRecording: {
    backgroundColor: colors.dangerRed,
    borderColor: colors.dangerRed,
  },
});
