import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import Input from "@/components/shared/TextInput/TextInput";
import { useCreateBlogPost } from "@/hooks/useBlog";
import { colors } from "@/constants/colors";
import styles from "./BlogComposer.styles";

interface BlogComposerProps {
  visible: boolean;
  onClose: () => void;
  onPosted: () => void;
}

const BlogComposer = ({ visible, onClose, onPosted }: BlogComposerProps) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const { mutate: createBlogPost, isPending } = useCreateBlogPost();

  const reset = () => {
    setTitle("");
    setBody("");
    setCoverImageUri(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to add a cover image to your post.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1200, 630],
      quality: 0.8,
    });

    if (result.canceled) return;
    setCoverImageUri(result.assets[0].uri);
  };

  const handlePost = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;

    createBlogPost(
      {
        title: trimmedTitle,
        body: trimmedBody,
        coverImageUri: coverImageUri ?? undefined,
      },
      {
        onSuccess: () => {
          onPosted();
          handleClose();
        },
        onError: (error: unknown) => {
          const message =
            (error as { message?: string })?.message ??
            "Something went wrong publishing that — try again.";
          Alert.alert("Couldn't publish", message);
        },
      },
    );
  };

  const canPost = title.trim().length > 0 && body.trim().length > 0 && !isPending;

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Write a Post"
      titleStyle={styles.modalTitle}
      headerAction={
        <TouchableOpacity
          style={[styles.submitButton, !canPost && styles.submitButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          <Text style={styles.submitButtonText}>
            {isPending ? "PUBLISHING..." : "PUBLISH"}
          </Text>
        </TouchableOpacity>
      }
    >
      <Input
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />

      {coverImageUri ? (
        <View style={styles.coverPreviewWrapper}>
          <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
          <TouchableOpacity
            style={styles.removeCoverButton}
            onPress={() => setCoverImageUri(null)}
          >
            <Feather name="x" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.attachCoverButton}
          onPress={handlePickCoverImage}
        >
          <Feather name="image" size={18} color={colors.primaryBlue} />
          <Text style={styles.attachCoverText}>Add a cover image</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.bodyInput}
        placeholder="Write your post..."
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />
    </Modal>
  );
};

export default BlogComposer;
