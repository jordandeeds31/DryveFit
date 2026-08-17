import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Purchases from "react-native-purchases";
import Feather from "@expo/vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Switch from "@/components/shared/Switch/Switch";
import Input from "@/components/shared/TextInput/TextInput";
import CityPicker from "@/components/shared/CityPicker/CityPicker";
import Toast from "@/components/shared/Toast/Toast";
import DevicesModal from "@/features/DevicesModal/DevicesModal";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useCurrentUser,
  useUpdateProfile,
  useUploadProfileImage,
  useDeleteProfileImage,
  useDeleteAccount,
} from "@/hooks/useUsers";
import { Gender, UnitSystem } from "@/types/user.types";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import {
  isHealthKitAvailable,
  hasCompletedHealthKitConnect,
  requestHealthKitAuthorization,
  disconnectHealthKit,
} from "@/lib/health/healthkit";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";

const Profile = () => {
  const { logout } = useAuth();
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
  const { mutate: deleteAccount, isPending: isDeletingAccount } =
    useDeleteAccount();
  const { isPro } = useSubscription();
  const authImageHeaders = useAuthImageHeaders();

  const [username, setUsername] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  // Defaults to "imperial" (not null) since that's what the rest of the
  // app already assumes wherever unitSystem hasn't been set yet — the
  // toggle should reflect the effective unit, not a raw unset state with
  // no selection.
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("imperial");
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Deliberately local, not the global auth isLoading — that flag is
  // login/register's own pending state (see authSlice.ts's
  // loginThunk.pending/registerThunk.pending); logoutThunk never touches
  // it, so using it here meant this button could read as permanently
  // "stuck" showing SIGNING OUT... whenever isLoading happened to be true
  // for a completely unrelated reason, with no connection to whether
  // sign-out was actually in progress.
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [healthKitStatus, setHealthKitStatus] = useState<
    "unavailable" | "not_connected" | "connected"
  >("not_connected");
  const [isConnectingHealthKit, setIsConnectingHealthKit] = useState(false);
  const [isDevicesModalVisible, setIsDevicesModalVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setUsername(currentUser.username ?? "");
    setCity(currentUser.city);
    setGender(currentUser.gender);
    setUnitSystem(currentUser.unitSystem ?? "imperial");
    setIsLeaderboardVisible(currentUser.isLeaderboardVisible);
  }, [currentUser]);

  // Re-checks on every focus (not just mount) so it picks up a connection
  // made via handleConnectHealthKit below. Note this is NOT re-deriving
  // "connected" from a live HealthKit query — Apple deliberately never
  // reveals true read-authorization status to apps, so that check was
  // unreliable and would sometimes report "not connected" even after the
  // user had genuinely granted access, forcing them to reconnect on every
  // app open. "Connected" is instead a locally persisted fact: has this app
  // completed the connect flow at least once.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "ios") {
        setHealthKitStatus("unavailable");
        return;
      }
      if (!currentUser) return;
      let cancelled = false;
      (async () => {
        const available = await isHealthKitAvailable();
        if (cancelled) return;
        if (!available) {
          setHealthKitStatus("unavailable");
          return;
        }
        const connected = await hasCompletedHealthKitConnect(currentUser.id);
        if (cancelled) return;
        setHealthKitStatus(connected ? "connected" : "not_connected");
      })();
      return () => {
        cancelled = true;
      };
    }, [currentUser]),
  );

  const usernameError =
    saveError && (saveError as { status?: number }).status === 409
      ? "That username is already taken"
      : null;

  // Compares against currentUser (not a separate "initial values" snapshot)
  // since the hydration effect above already keeps local state in sync
  // with it whenever there's nothing unsaved — so this only goes true once
  // the user has actually typed/toggled something new.
  const isDirty =
    !!currentUser &&
    (username.trim() !== (currentUser.username ?? "") ||
      city !== currentUser.city ||
      gender !== currentUser.gender ||
      unitSystem !== (currentUser.unitSystem ?? "imperial") ||
      isLeaderboardVisible !== currentUser.isLeaderboardVisible);

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

    uploadImage(result.assets[0].uri, {
      onSuccess: () => setToastMessage("Profile picture updated"),
    });
  };

  const handleRemoveImage = () => {
    removeImage(undefined, {
      onSuccess: () => setToastMessage("Profile picture removed"),
    });
  };

  const handleSave = () => {
    const trimmedUsername = username.trim();
    saveProfile(
      {
        username: trimmedUsername.length > 0 ? trimmedUsername : undefined,
        city: city ?? undefined,
        gender: gender ?? undefined,
        unitSystem,
        isLeaderboardVisible,
      },
      {
        onSuccess: () => {
          setToastMessage("Profile saved");
        },
      },
    );
  };

  const handleConnectHealthKit = async () => {
    if (!currentUser) return;
    setIsConnectingHealthKit(true);
    const granted = await requestHealthKitAuthorization(currentUser.id);
    setIsConnectingHealthKit(false);

    if (!granted) {
      Alert.alert(
        "Couldn't connect",
        "Apple Health didn't respond. If a permission prompt appeared, try answering it again, or check Settings > Health > Data Access & Devices > DryveFit.",
      );
      return;
    }
    setHealthKitStatus("connected");
    setToastMessage("Apple Health connected");
  };

  const handleDisconnectHealthKit = async () => {
    if (!currentUser) return;
    await disconnectHealthKit(currentUser.id);
    setHealthKitStatus("not_connected");
    setToastMessage("Apple Health turned off");
  };

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You'll need to sign back in to continue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await logout();
            router.replace("/(auth)/signin");
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  // Deleting the account here only removes it from our own backend — an
  // active App Store/Play subscription is billed by Apple/Google directly
  // and isn't touched by that at all, so a subscriber has to separately
  // cancel it themselves or they'll keep being charged. showManageSubscriptions
  // opens the native subscription-management screen so they can do that
  // immediately after deleting, instead of needing to know where to find it.
  const finishAccountDeletion = async () => {
    await Purchases.logOut().catch(() => {});
    await logout();
    router.replace("/(auth)/signin");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account and everything in it — programs, workout logs, posts, everything. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            deleteAccount(undefined, {
              onSuccess: () => {
                if (!isPro) {
                  finishAccountDeletion();
                  return;
                }
                Alert.alert(
                  "Cancel your subscription",
                  "Your account is deleted, but your subscription is billed through the App Store/Play Store separately, so this doesn't cancel it — you'll keep being charged unless you cancel it yourself. Open subscription settings now?",
                  [
                    { text: "Later", onPress: finishAccountDeletion },
                    {
                      text: "Open Subscription Settings",
                      onPress: async () => {
                        await Purchases.showManageSubscriptions().catch(
                          () => {},
                        );
                        finishAccountDeletion();
                      },
                    },
                  ],
                );
              },
              onError: () => {
                Alert.alert(
                  "Couldn't delete account",
                  "Something went wrong — try again.",
                );
              },
            });
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Profile</Text>

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

          <Text style={styles.sectionLabel}>Leaderboard identity</Text>
          <Text style={styles.sectionSubtext}>
            Set a username and city to appear on the leaderboard and compare
            your lifts against other users.
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

          <View style={styles.fieldSpacer}>
            <Text style={styles.fieldLabel}>Units</Text>
            <Text style={styles.fieldHint}>
              Detected automatically from your location when you signed up
              — change it here if it's wrong.
            </Text>
            <View style={styles.unitsRow}>
              <TouchableOpacity
                style={[
                  styles.unitsOption,
                  unitSystem === "imperial" && styles.unitsOptionActive,
                ]}
                onPress={() => setUnitSystem("imperial")}
              >
                <Text
                  style={[
                    styles.unitsOptionText,
                    unitSystem === "imperial" && styles.unitsOptionTextActive,
                  ]}
                >
                  Imperial (lbs, mi)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitsOption,
                  unitSystem === "metric" && styles.unitsOptionActive,
                ]}
                onPress={() => setUnitSystem("metric")}
              >
                <Text
                  style={[
                    styles.unitsOptionText,
                    unitSystem === "metric" && styles.unitsOptionTextActive,
                  ]}
                >
                  Metric (kg, km)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>Show me on leaderboards</Text>
              <Text style={styles.switchSubtext}>
                Turn this off to hide your username and lifts from everyone
                else's leaderboard.
              </Text>
            </View>
            <Switch
              value={isLeaderboardVisible}
              onValueChange={setIsLeaderboardVisible}
            />
          </View>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => router.push("/(tabs)/Programs")}
          >
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>Programs</Text>
              <Text style={styles.switchSubtext}>
                View and manage all your training programs
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => setIsDevicesModalVisible(true)}
          >
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>Devices</Text>
              <Text style={styles.switchSubtext}>
                {healthKitStatus === "connected"
                  ? "Apple Health connected — manage other devices"
                  : healthKitStatus === "unavailable"
                    ? "Connect your health devices"
                    : "Connect Apple Health and other health devices"}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.signOutButton,
                isSigningOut && styles.signOutButtonDisabled,
              ]}
              onPress={handleSignOut}
              disabled={isSigningOut}
            >
              <Text style={styles.signOutButtonText}>
                {isSigningOut ? "SIGNING OUT..." : "SIGN OUT"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
          >
            <Text style={styles.deleteAccountText}>
              {isDeletingAccount ? "Deleting Account..." : "Delete Account"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {isDirty && (
          <TouchableOpacity
            style={styles.savePill}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.savePillText}>
              {isSaving ? "Saving..." : "Save changes"}
            </Text>
          </TouchableOpacity>
        )}
        <Toast
          visible={!!toastMessage}
          message={toastMessage ?? ""}
          onHide={() => setToastMessage(null)}
        />
        <DevicesModal
          visible={isDevicesModalVisible}
          onClose={() => setIsDevicesModalVisible(false)}
          healthKitStatus={healthKitStatus}
          isConnectingHealthKit={isConnectingHealthKit}
          onConnectHealthKit={handleConnectHealthKit}
          onDisconnectHealthKit={handleDisconnectHealthKit}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
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
  sectionLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
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
  unitsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  unitsOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
  },
  unitsOptionActive: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
  unitsOptionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  unitsOptionTextActive: {
    color: colors.primaryBlue,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  switchTextGroup: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  switchLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  switchSubtext: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  savePill: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: colors.primaryBlue,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 998,
  },
  savePillText: {
    color: "white",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  buttonContainer: {
    marginTop: spacing.xl,
  },
  signOutButton: {
    backgroundColor: colors.dangerRed,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: "white",
    fontWeight: fontWeights.semibold,
  },
  deleteAccountButton: {
    alignItems: "center",
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  deleteAccountText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.dangerRed,
    textDecorationLine: "underline",
  },
});
