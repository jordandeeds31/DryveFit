import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PostDetailContent from "./PostDetailContent";

interface PostDetailModalProps {
  // null both means "closed" and disables the post/comments queries inside
  // PostDetailContent — no separate visible flag needed.
  postId: string | null;
  onClose: () => void;
}

const PostDetailModal = ({ postId, onClose }: PostDetailModalProps) => {
  return (
    <RNModal
      visible={!!postId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Absolutely-positioned sibling behind the sheet, not a wrapper
            around it — see Modal.tsx's own comment on this pattern, same
            reasoning applies here (sheet contains a FlatList/TextInput). */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <SafeAreaView edges={["bottom"]} style={styles.sheet}>
          <PostDetailContent
            postId={postId}
            onClose={onClose}
            closeIcon="chevron-down"
          />
        </SafeAreaView>
      </View>
    </RNModal>
  );
};

export default PostDetailModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "90%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
});
