import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import { useCreatePost } from "@/hooks/usePosts";
import { colors } from "@/constants/colors";
import styles from "./Feed.styles";

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPosted: (message: string) => void;
}

const VideoPreview = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });

  return (
    <VideoView
      style={styles.imagePreview}
      player={player}
      contentFit="cover"
      nativeControls
    />
  );
};

const CreatePostModal = ({
  visible,
  onClose,
  onPosted,
}: CreatePostModalProps) => {
  const [caption, setCaption] = useState("");
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const { mutate: createPost, isPending } = useCreatePost();

  const reset = () => {
    setCaption("");
    setMediaUri(null);
    setMediaType(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to attach a photo or video to your post.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets[0];
    setMediaUri(asset.uri);
    setMediaType(asset.type === "video" ? "video" : "image");
  };

  const handleRemoveMedia = () => {
    setMediaUri(null);
    setMediaType(null);
  };

  const handlePost = () => {
    const trimmedCaption = caption.trim();
    if (!trimmedCaption && !mediaUri) return;

    createPost(
      {
        caption: trimmedCaption || undefined,
        mediaUri: mediaUri ?? undefined,
        mediaType: mediaType ?? undefined,
      },
      {
        onSuccess: () => {
          onPosted("Post shared");
          handleClose();
        },
        onError: (error: unknown) => {
          const message =
            (error as { message?: string })?.message ??
            "Something went wrong posting that — try again.";
          Alert.alert("Couldn't post", message);
        },
      },
    );
  };

  const canPost = (caption.trim().length > 0 || !!mediaUri) && !isPending;

  return (
    <Modal visible={visible} onClose={handleClose}>
      <View style={styles.createPostHeaderRow}>
        <Text style={styles.modalTitle}>New Post</Text>
        <TouchableOpacity
          style={[
            styles.postSubmitButton,
            !canPost && styles.postSubmitButtonDisabled,
          ]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <Text style={styles.postSubmitButtonText}>
            {isPending ? "POSTING..." : "POST"}
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.captionInput}
        placeholder="Share something with everyone..."
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={500}
      />

      {mediaUri ? (
        <View style={styles.imagePreviewWrapper}>
          {mediaType === "video" ? (
            <VideoPreview uri={mediaUri} />
          ) : (
            <Image source={{ uri: mediaUri }} style={styles.imagePreview} />
          )}
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={handleRemoveMedia}
          >
            <Feather name="x" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.attachImageButton}
          onPress={handlePickMedia}
        >
          <Feather name="image" size={18} color={colors.primaryBlue} />
          <Text style={styles.attachImageText}>Add a photo or video</Text>
        </TouchableOpacity>
      )}
    </Modal>
  );
};

export default CreatePostModal;
