import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { safeGoBack } from "@/lib/utils/navigation.utils";
import PostDetailContent from "@/features/Feed/PostDetailContent";

const PostScreen = () => {
  // replyTo arrives from a "X commented on your post" notification — see
  // notifications.tsx — so the reply box can open pre-selected on that
  // specific comment instead of leaving the viewer to find it themselves.
  const { postId, replyTo } = useLocalSearchParams<{
    postId: string;
    replyTo?: string;
  }>();

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <PostDetailContent
        postId={postId ?? null}
        initialReplyId={replyTo}
        onClose={safeGoBack}
      />
    </SafeAreaView>
  );
};

export default PostScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
});
