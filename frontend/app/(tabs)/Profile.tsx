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
  ActivityIndicator,
} from "react-native";
import Purchases from "react-native-purchases";
import Feather from "@expo/vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import Switch from "@/components/shared/Switch/Switch";
import Toast from "@/components/shared/Toast/Toast";
import DevicesModal from "@/features/DevicesModal/DevicesModal";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useCurrentUser, useUpdateProfile, useDeleteAccount } from "@/hooks/useUsers";
import { UnitSystem } from "@/types/user.types";
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
  const { openDevices } = useLocalSearchParams<{ openDevices?: string }>();
  const { logout } = useAuth();
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();
  const { mutate: saveProfile, isPending: isSaving } = useUpdateProfile();
  const { mutate: deleteAccount, isPending: isDeletingAccount } =
    useDeleteAccount();
  const { isPro } = useSubscription();

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

  // Home's device-setup banner and Cardio's watch banner both redirect here
  // with ?openDevices=1 rather than duplicating the modal on their own
  // screens — this is what actually opens it for them.
  useEffect(() => {
    if (openDevices === "1") {
      setIsDevicesModalVisible(true);
      router.setParams({ openDevices: undefined });
    }
  }, [openDevices]);

  useEffect(() => {
    if (!currentUser) return;
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

  // Username itself now lives on the profile screen's EditProfileModal —
  // this only needs to know whether one is SET, to explain why the
  // leaderboard-visibility toggle below might not actually do anything yet.
  const hasUsername = !!currentUser?.username;

  // Compares against currentUser (not a separate "initial values" snapshot)
  // since the hydration effect above already keeps local state in sync
  // with it whenever there's nothing unsaved — so this only goes true once
  // the user has actually toggled something new.
  const isDirty =
    !!currentUser &&
    (unitSystem !== (currentUser.unitSystem ?? "imperial") ||
      isLeaderboardVisible !== currentUser.isLeaderboardVisible);

  const handleSave = () => {
    saveProfile(
      { unitSystem, isLeaderboardVisible },
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
    const { granted, isStuckAfterPriorDecline } = await requestHealthKitAuthorization(
      currentUser.id,
    );
    setIsConnectingHealthKit(false);

    if (!granted) {
      // Once the read permissions this app requests have been declined
      // once, iOS never shows that part of the sheet again — tapping
      // Connect from here on can only ever re-prompt for write access, so
      // "try again" is no longer real advice past the first failure. See
      // requestHealthKitAuthorization's isStuckAfterPriorDecline comment.
      Alert.alert(
        "Couldn't connect",
        isStuckAfterPriorDecline
          ? "Apple Health access was declined earlier, and iOS won't ask again from inside the app. Go to Settings > Health > Data Access & Devices > DryveFit and turn on the categories under Allow, then come back and try again."
          : "Apple Health didn't respond. If a permission prompt appeared, try answering it again, or check Settings > Health > Data Access & Devices > DryveFit.",
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

  if (isCurrentUserLoading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView
        style={styles.container}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            // Explicitly back to the viewer's own profile rather than
            // router.back() — Settings is only ever reached from there
            // (the profile screen's gear icon), and this guarantees that
            // regardless of what's actually on the nav stack.
            onPress={() =>
              currentUser
                ? router.replace(`/user/${currentUser.id}`)
                : router.back()
            }
          >
            <Feather name="chevron-left" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
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
                {hasUsername
                  ? "Turn this off to hide your username and lifts from everyone else's leaderboard."
                  : "Set a username on your profile to actually appear on the leaderboard."}
              </Text>
            </View>
            <Switch
              // The backend's leaderboard query requires isLeaderboardVisible
              // AND a non-null username — displaying the raw stored flag
              // here would show ON for a brand-new user (defaults to true)
              // who has no username yet and so can't actually appear.
              // onValueChange still writes the raw intent, not this derived
              // value, so setting a username later doesn't need the toggle
              // re-flipped.
              value={isLeaderboardVisible && hasUsername}
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
    // Pinned to the bottom instead of the top — the header row (back
    // button + "Settings" title) added later sits right where this used
    // to float, so it was overlapping that instead of the page content.
    bottom: spacing.lg,
    alignSelf: "center",
    backgroundColor: colors.primaryBlue,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
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
