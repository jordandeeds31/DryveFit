import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useToggleCommentLike, useDeleteComment } from "@/hooks/usePosts";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { PostComment } from "@/types/posts.types";
import { colors } from "@/constants/colors";
import styles from "./Feed.styles";

// Replies can reply to replies indefinitely (matches the backend, which
// has no depth limit) — indentation is capped so a long thread doesn't
// eventually squeeze the text into a sliver, but the nesting itself keeps
// going as deep as the data does.
const MAX_VISUAL_INDENT_DEPTH = 4;
const INDENT_PER_DEPTH = 16;

interface CommentItemProps {
  comment: PostComment;
  postId: string;
  depth: number;
  onReply: (comment: PostComment) => void;
}

const CommentItem = ({ comment, postId, depth, onReply }: CommentItemProps) => {
  const authImageHeaders = useAuthImageHeaders();
  const { mutate: toggleCommentLike } = useToggleCommentLike();
  const { mutate: deleteComment } = useDeleteComment();

  const indent = Math.min(depth, MAX_VISUAL_INDENT_DEPTH) * INDENT_PER_DEPTH;

  return (
    <View style={{ marginLeft: indent }}>
      <View style={styles.commentRow}>
        {comment.author.profileImageUrl && authImageHeaders ? (
          <Image
            source={{
              uri: `${process.env.EXPO_PUBLIC_API_URL}${comment.author.profileImageUrl}`,
              headers: authImageHeaders,
            }}
            style={styles.commentAvatar}
          />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Feather name="user" size={12} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.commentBody}>
          <Text style={styles.commentUsername}>
            {comment.author.username ?? "Someone"}
          </Text>
          <Text style={styles.commentContent}>{comment.content}</Text>
          <View style={styles.commentActionsRow}>
            <TouchableOpacity
              style={styles.commentActionButton}
              onPress={() =>
                toggleCommentLike({
                  commentId: comment.id,
                  postId,
                  isLiked: comment.isLikedByViewer,
                })
              }
            >
              <Ionicons
                name={comment.isLikedByViewer ? "heart" : "heart-outline"}
                size={14}
                color={
                  comment.isLikedByViewer
                    ? colors.dangerRed
                    : colors.textSecondary
                }
              />
              {comment.likeCount > 0 && (
                <Text style={styles.commentActionText}>
                  {comment.likeCount}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onReply(comment)}>
              <Text style={styles.commentReplyText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
        {comment.isOwnComment && (
          <TouchableOpacity
            onPress={() => deleteComment({ commentId: comment.id, postId })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={14} color={colors.dangerRed} />
          </TouchableOpacity>
        )}
      </View>

      {comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default CommentItem;
