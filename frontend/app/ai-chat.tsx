import { useState } from "react";
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
import Feather from "@expo/vector-icons/Feather";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import {
  useChatHistory,
  useSendChatMessage,
  useClearChatHistory,
} from "@/hooks/useChat";
import { ChatMessage, ChatRole } from "@/types/chat.types";

const SUGGESTIONS = [
  "How's my squat progressing?",
  "What are my current personal records?",
  "Summarize my last week of workouts",
];

type DisplayItem =
  | { id: string; kind: "message"; role: ChatRole; content: string }
  | { id: "typing"; kind: "typing" };

const AiChatScreen = () => {
  const [draft, setDraft] = useState("");
  const [optimisticMessage, setOptimisticMessage] = useState<string | null>(
    null,
  );

  const { data: history, isLoading: isLoadingHistory } = useChatHistory();
  const { mutate: sendMessage, isPending: isSending } = useSendChatMessage();
  const { mutate: clearHistory, isPending: isClearing } =
    useClearChatHistory();

  const handleSend = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setDraft("");
    setOptimisticMessage(trimmed);

    sendMessage(trimmed, {
      onSuccess: () => setOptimisticMessage(null),
      onError: () => {
        setOptimisticMessage(null);
        Alert.alert("Couldn't send message", "Please try again.");
      },
    });
  };

  const handleClear = () => {
    if (!history || history.length === 0) return;
    Alert.alert(
      "Clear this conversation?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearHistory(),
        },
      ],
    );
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
  for (let i = (history?.length ?? 0) - 1; i >= 0; i--) {
    const message = history![i];
    items.push({
      id: message.id,
      kind: "message",
      role: message.role,
      content: message.content,
    });
  }

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
        <Text style={styles.headerTitle}>Dryve AI Coach</Text>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={handleClear}
          disabled={isClearing || !history || history.length === 0}
        >
          <Feather
            name="trash-2"
            size={20}
            color={
              !history || history.length === 0
                ? colors.textMuted
                : colors.dangerRed
            }
          />
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
            <Feather
              name="message-circle"
              size={32}
              color={colors.textMuted}
            />
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
          <TextInput
            style={styles.input}
            placeholder="Ask about your training..."
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
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
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
});
