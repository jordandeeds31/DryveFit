import { useState } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { useComments, useAddComment } from "@/hooks/usePosts";
import { PostComment } from "@/types/posts.types";
import { colors } from "@/constants/colors";
import CommentItem from "./CommentItem";
import styles from "./Feed.styles";

interface CommentsModalProps {
  postId: string | null;
  onClose: () => void;
}

const CommentsModal = ({ postId, onClose }: CommentsModalProps) => {
  const insets = useSafeAreaInsets();
  const { data: comments, isLoading } = useComments(postId);
  const { mutate: addComment, isPending } = useAddComment();
  const [text, setText] = useState("");
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);

  const handleClose = () => {
    setReplyingTo(null);
    setText("");
    onClose();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !postId) return;

    addComment(
      { postId, content: trimmed, parentId: replyingTo?.id },
      {
        onSuccess: () => {
          setText("");
          setReplyingTo(null);
        },
      },
    );
  };

  return (
    <RNModal
      visible={!!postId}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              style={styles.commentsListContainer}
              data={comments ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: PostComment }) =>
                postId ? (
                  <CommentItem
                    comment={item}
                    postId={postId}
                    depth={0}
                    onReply={setReplyingTo}
                  />
                ) : null
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No comments yet — be the first.
                </Text>
              }
            />
          )}

          {replyingTo && (
            <View style={styles.replyingToRow}>
              <Text style={styles.replyingToText}>
                Replying to {replyingTo.author.username ?? "Someone"}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.commentInputRow,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <TextInput
              style={styles.commentInput}
              placeholder={
                replyingTo
                  ? `Reply to ${replyingTo.author.username ?? "Someone"}...`
                  : "Add a comment..."
              }
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || isPending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="send"
                size={20}
                color={text.trim() ? colors.primaryBlue : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

export default CommentsModal;
