import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import Modal from "@/components/shared/Modal/Modal";
import Input from "@/components/shared/TextInput/TextInput";
import CityPicker from "@/components/shared/CityPicker/CityPicker";
import {
  useCurrentUser,
  useUpdateProfile,
  useUploadProfileImage,
  useDeleteProfileImage,
} from "@/hooks/useUsers";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { Gender } from "@/types/user.types";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Photo, username, city, and gender — the "who you are on the leaderboard"
// identity fields — live here, reached from the viewer's own profile
// (app/(tabs)/user/[userId].tsx) rather than the Settings screen, which
// only keeps account-level things (units, leaderboard visibility toggle,
// Programs/Devices links, sign out, delete account).
const EditProfileModal = ({ visible, onClose, onSaved }: EditProfileModalProps) => {
  const { data: currentUser } = useCurrentUser();
  const {
    mutate: saveProfile,
    isPending: isSaving,
    error: saveError,
  } = useUpdateProfile();
  const { mutate: uploadImage, isPending: isUploadingImage } =
    useUploadProfileImage();
  const { mutate: removeImage, isPending: isRemovingImage } =
    useDeleteProfileImage();
  const authImageHeaders = useAuthImageHeaders();

  const [username, setUsername] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);

  // Re-hydrates from currentUser every time the modal opens, so a prior
  // edit that was cancelled (not saved) doesn't linger in these fields the
  // next time it's opened.
  useEffect(() => {
    if (!visible || !currentUser) return;
    setUsername(currentUser.username ?? "");
    setCity(currentUser.city);
    setGender(currentUser.gender);
  }, [visible, currentUser]);

  // Same 400/409 handling as the old Settings screen — both are
  // username-specific rejections from this same PATCH.
  const usernameError =
    saveError &&
    [400, 409].includes((saveError as { status?: number }).status ?? 0)
      ? ((saveError as { message?: string }).message ??
        "That username isn't valid")
      : null;

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to set a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    uploadImage(result.assets[0].uri);
  };

  const handleRemoveImage = () => {
    removeImage(undefined);
  };

  const handleSave = () => {
    const trimmedUsername = username.trim();
    // Only sent when actually changing, same reasoning as the old Settings
    // screen — otherwise a genuine "clear my username" attempt silently
    // no-ops instead of reaching the backend for real validation.
    const usernameChanged = trimmedUsername !== (currentUser?.username ?? "");
    saveProfile(
      {
        username: usernameChanged ? trimmedUsername : undefined,
        city: city ?? undefined,
        gender: gender ?? undefined,
      },
      {
        onSuccess: () => {
          onSaved();
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} closable={!isSaving}>
      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.avatarSection}>
        {currentUser?.profileImageUrl && authImageHeaders ? (
          <Image
            source={{
              uri: `${process.env.EXPO_PUBLIC_API_URL}${currentUser.profileImageUrl}`,
              headers: authImageHeaders,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={32} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.avatarActions}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={isUploadingImage}
          >
            <Text style={styles.avatarActionText}>
              {isUploadingImage
                ? "Uploading..."
                : currentUser?.profileImageUrl
                  ? "Change Photo"
                  : "Add Photo"}
            </Text>
          </TouchableOpacity>
          {currentUser?.profileImageUrl && (
            <TouchableOpacity
              onPress={handleRemoveImage}
              disabled={isRemovingImage}
            >
              <Text style={styles.avatarRemoveText}>
                {isRemovingImage ? "Removing..." : "Remove Photo"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.sectionSubtext}>
        Set a username and city to appear on the leaderboard and compare your
        lifts against other users.
      </Text>

      <Input
        label="Username"
        placeholder="Choose a username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        error={usernameError}
      />

      <View style={styles.fieldSpacer}>
        <Text style={styles.fieldLabel}>City</Text>
        <CityPicker selectedCity={city} setSelectedCity={setCity} />
      </View>

      <View style={styles.fieldSpacer}>
        <Text style={styles.fieldLabel}>Gender</Text>
        <Text style={styles.fieldHint}>
          Used to show you on the Men's or Women's leaderboard.
        </Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[
              styles.genderOption,
              gender === "male" && styles.genderOptionActive,
            ]}
            onPress={() => setGender("male")}
          >
            <Text
              style={[
                styles.genderOptionText,
                gender === "male" && styles.genderOptionTextActive,
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderOption,
              gender === "female" && styles.genderOptionActive,
            ]}
            onPress={() => setGender("female")}
          >
            <Text
              style={[
                styles.genderOptionText,
                gender === "female" && styles.genderOptionTextActive,
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? "Saving..." : "Save"}
        </Text>
      </TouchableOpacity>
    </Modal>
  );
};

export default EditProfileModal;

const styles = StyleSheet.create({
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.md,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActions: {
    gap: spacing.xs,
  },
  avatarActionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
  },
  avatarRemoveText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.dangerRed,
  },
  sectionSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  fieldSpacer: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  fieldHint: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
  },
  genderOptionActive: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
  genderOptionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  genderOptionTextActive: {
    color: colors.primaryBlue,
  },
  saveButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primaryBlue,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.extrabold,
  },
});
