import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import {
  usePublicProfile,
  usePublicWorkoutHistory,
  usePublicActiveProgram,
  usePublicNutritionHistory,
  usePublicPosts,
  useToggleFollow,
  useCurrentUser,
  useUpdateProfile,
} from "@/hooks/useUsers";
import { useDeletePost } from "@/hooks/usePosts";
import {
  usePrograms,
  useInheritWorkoutDay,
  useInheritWorkoutDayAsNewProgram,
  useInheritStandaloneLogAsNewProgram,
} from "@/hooks/usePrograms";
import InheritDatePickerModal from "@/features/InheritWorkout/InheritDatePickerModal";
import EditProfileModal from "@/features/PublicProfile/EditProfileModal";
import NutritionMonthCalendar from "@/features/PublicProfile/NutritionMonthCalendar";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { useCreateDmConversation } from "@/hooks/useDirectMessages";
import { ensureProAccess } from "@/lib/purchases/requirePro";
import {
  PublicWorkoutLog,
  PublicNutritionDay,
  PublicNutritionEntry,
} from "@/types/user.types";
import {
  Program,
  ProgramWeek,
  ProgramDay,
  ProgramExercise,
} from "@/types/programs.types";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "@/types/nutrition.types";
import { Post } from "@/types/posts.types";
import Toast from "@/components/shared/Toast/Toast";
import Modal from "@/components/shared/Modal/Modal";

const formatLoggedAt = (dateStr: string) =>
  formatCalendarDate(dateStr, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// Paused by default (not autoplaying/looping) — this profile screen can
// have several of these mounted at once via the Social tab's post list,
// same reasoning as Feed's own video card.
const SocialPostVideo = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri);

  return (
    <VideoView
      style={styles.postMedia}
      player={player}
      contentFit="cover"
      nativeControls
    />
  );
};

type ProfileTab = "workouts" | "nutrition" | "social";

const UserProfileScreen = () => {
  const { userId, openEdit } = useLocalSearchParams<{
    userId: string;
    // Set by links that want this screen to land with EditProfileModal
    // already open (e.g. the Leaderboard setup banners) — same pattern as
    // Settings' own ?openDevices=1.
    openEdit?: string;
  }>();
  const authImageHeaders = useAuthImageHeaders();
  const [tab, setTab] = useState<ProfileTab>("workouts");

  const { data: currentUser } = useCurrentUser();
  const isOwnProfile = !!currentUser && currentUser.id === userId;
  const { mutate: deletePost } = useDeletePost();
  const { mutate: saveProfile, isPending: isTogglingLeaderboardVisible } =
    useUpdateProfile();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Mirrors the leaderboard's own eligibility check (username + city +
  // gender + isLeaderboardVisible) — used to prompt the viewer, on their
  // own profile, when they wouldn't actually show up there yet.
  const missingLeaderboardField = !currentUser?.username
    ? "username"
    : !currentUser?.city
      ? "city"
      : !currentUser?.gender
        ? "gender"
        : null;
  const isShownOnLeaderboard =
    !missingLeaderboardField && !!currentUser?.isLeaderboardVisible;

  useEffect(() => {
    if (openEdit === "1" && isOwnProfile) {
      setIsEditProfileOpen(true);
      router.setParams({ openEdit: undefined });
    }
  }, [openEdit, isOwnProfile]);

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = usePublicProfile(userId ?? null);
  const { data: workoutLogs, isLoading: isHistoryLoading } =
    usePublicWorkoutHistory(userId ?? null);
  const { data: activeProgram, isLoading: isProgramLoading } =
    usePublicActiveProgram(userId ?? null);
  // undefined = current month (the hook/API default) — set once the viewer
  // navigates the calendar to a different month.
  const [nutritionMonthKey, setNutritionMonthKey] = useState<string | undefined>(
    undefined,
  );
  const [selectedNutritionDate, setSelectedNutritionDate] = useState<
    string | null
  >(null);
  const { data: nutritionDays, isLoading: isNutritionLoading } =
    usePublicNutritionHistory(userId ?? null, nutritionMonthKey);
  const selectedNutritionDay = nutritionDays?.find(
    (day: PublicNutritionDay) => day.date === selectedNutritionDate,
  );
  const { data: posts, isLoading: isPostsLoading } = usePublicPosts(
    userId ?? null,
  );
  const { mutate: toggleFollow, isPending: isTogglingFollow } =
    useToggleFollow();
  const { mutate: createDmConversation, isPending: isStartingConversation } =
    useCreateDmConversation();
  const { mutate: inheritWorkoutDay, isPending: isInheriting } =
    useInheritWorkoutDay();
  const {
    mutate: inheritWorkoutDayAsNewProgram,
    isPending: isSchedulingDayInherit,
  } = useInheritWorkoutDayAsNewProgram();
  const {
    mutate: inheritStandaloneLogAsNewProgram,
    isPending: isSchedulingLogInherit,
  } = useInheritStandaloneLogAsNewProgram();
  const { data: ownPrograms } = usePrograms();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Whatever's currently going through the "no active program" Inherit
  // Workout flow — a program day or a completed standalone log — holds
  // the date picker modal open while set, cleared once scheduled or
  // cancelled. Either source ends up going through the same
  // createSingleDayInheritedProgram path on the backend.
  const [pendingInheritSource, setPendingInheritSource] = useState<
    { kind: "programDay"; day: ProgramDay } | { kind: "log"; log: PublicWorkoutLog } | null
  >(null);
  const isSchedulingInherit = isSchedulingDayInherit || isSchedulingLogInherit;

  // Inheriting means overriding an existing program's schedule — with no
  // program of their own to override, there's nothing to slot this into,
  // so a viewer with no active program instead gets a brand new minimal
  // program created just for the day they pick (see handleInheritAsNewProgram
  // below).
  const hasOwnActiveProgram = !!ownPrograms?.some(
    (program: Program) => program.isActive,
  );

  const performInherit = (
    day: ProgramDay,
    force: boolean,
    rebalanceWithAI = false,
  ) => {
    inheritWorkoutDay(
      { dayId: day.id, force, rebalanceWithAI },
      {
        onSuccess: (data: { updatedCount: number }) =>
          setToastMessage(
            rebalanceWithAI
              ? `Copied to your ${day.dayName} and adjusted the conflicting day(s) to avoid overlap`
              : `Copied to your ${day.dayName} (${data.updatedCount} ${data.updatedCount === 1 ? "week" : "weeks"})`,
          ),
        onError: (error: unknown) => {
          const typedError = error as { status?: number; message?: string };
          // A conflict (409) means this would double up a muscle group
          // with the day before/after in the viewer's own schedule — not
          // a hard failure, just needs a second, more specific choice
          // before proceeding: override and leave the overlap, or have AI
          // reassign the conflicting day(s) to a non-overlapping focus.
          if (typedError?.status === 409) {
            Alert.alert(
              "Heads up",
              typedError.message ?? "This overlaps with your existing schedule.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Copy Anyway",
                  onPress: () => performInherit(day, true, false),
                },
                {
                  text: "Adjust My Schedule",
                  onPress: () => performInherit(day, false, true),
                },
              ],
            );
            return;
          }
          setToastMessage(typedError?.message ?? "Couldn't copy that workout");
        },
      },
    );
  };

  const handleInherit = async (day: ProgramDay) => {
    const granted = await ensureProAccess();
    if (!granted) return;

    Alert.alert(
      "Copy this workout?",
      `This will replace every ${day.dayName} in your program with ${profile?.username ?? "their"}'s ${day.focus} day — not just this week.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Copy", onPress: () => performInherit(day, false) },
      ],
    );
  };

  // No active program to slot this into — ask which date to schedule it
  // on instead, then create a minimal one-day program there (see
  // useInheritWorkoutDayAsNewProgram). It shows up on the calendar exactly
  // like a real program day: unlogged until they actually do it.
  const handleInheritAsNewProgram = async (day: ProgramDay) => {
    const granted = await ensureProAccess();
    if (!granted) return;
    setPendingInheritSource({ kind: "programDay", day });
  };

  // Same idea, sourced from an already-completed standalone log (their
  // profile's "Recent Workouts") instead of a program day — see
  // useInheritStandaloneLogAsNewProgram / inheritStandaloneLogAsNewProgram
  // (backend derives a sets/reps target from what was actually logged).
  const handleInheritLogAsNewProgram = async (log: PublicWorkoutLog) => {
    const granted = await ensureProAccess();
    if (!granted) return;
    setPendingInheritSource({ kind: "log", log });
  };

  const handleConfirmInheritDate = (dateKey: string) => {
    if (!pendingInheritSource) return;

    if (pendingInheritSource.kind === "programDay") {
      const { day } = pendingInheritSource;
      inheritWorkoutDayAsNewProgram(
        { dayId: day.id, date: dateKey },
        {
          onSuccess: () => {
            setPendingInheritSource(null);
            setToastMessage(`Scheduled ${day.focus} for that day`);
          },
          onError: (error: unknown) => {
            const typedError = error as { message?: string };
            setToastMessage(
              typedError?.message ?? "Couldn't schedule that workout",
            );
          },
        },
      );
      return;
    }

    const { log } = pendingInheritSource;
    inheritStandaloneLogAsNewProgram(
      { logId: log.id, date: dateKey },
      {
        onSuccess: () => {
          setPendingInheritSource(null);
          setToastMessage("Scheduled that workout for that day");
        },
        onError: (error: unknown) => {
          const typedError = error as { message?: string };
          setToastMessage(
            typedError?.message ?? "Couldn't schedule that workout",
          );
        },
      },
    );
  };

  // Same confirm-then-delete pattern as Feed.tsx's own handleDelete — this
  // screen shows the same posts (via usePublicPosts) when it's the
  // viewer's own profile, so deleting one here needs to behave identically.
  const handleDeletePost = (post: Post) => {
    Alert.alert("Delete this post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deletePost(post.id, {
            onSuccess: () => setToastMessage("Post deleted"),
          }),
      },
    ]);
  };

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {isOwnProfile ? (
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => router.push("/(tabs)/Profile")}
          >
            <Feather name="settings" size={22} color="#000" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {isProfileLoading && (
        <ActivityIndicator style={{ marginTop: spacing.xl }} />
      )}

      {!isProfileLoading && profileError && (
        <Text style={styles.emptyText}>
          This profile isn't available anymore.
        </Text>
      )}

      {!isProfileLoading && profile && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileHeader}>
            {profile.profileImageUrl && authImageHeaders ? (
              <Image
                source={{
                  uri: `${process.env.EXPO_PUBLIC_API_URL}${profile.profileImageUrl}`,
                  headers: authImageHeaders,
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={28} color={colors.textSecondary} />
              </View>
            )}
            <Text style={styles.username}>{profile.username}</Text>
            {profile.city && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={12} color={colors.textSecondary} />
                <Text style={styles.locationText}>{profile.city}</Text>
              </View>
            )}
            <View style={styles.followStatsRow}>
              <Text style={styles.followStat}>
                <Text style={styles.followStatCount}>
                  {profile.followerCount}
                </Text>{" "}
                {profile.followerCount === 1 ? "follower" : "followers"}
              </Text>
              <Text style={styles.followStat}>
                <Text style={styles.followStatCount}>
                  {profile.followingCount}
                </Text>{" "}
                following
              </Text>
            </View>

            {isOwnProfile && !isShownOnLeaderboard && (
              <TouchableOpacity
                style={styles.leaderboardPromptBanner}
                onPress={() =>
                  missingLeaderboardField
                    ? setIsEditProfileOpen(true)
                    : saveProfile(
                        { isLeaderboardVisible: true },
                        {
                          onSuccess: () =>
                            setToastMessage("You're now shown on the leaderboard"),
                        },
                      )
                }
                disabled={isTogglingLeaderboardVisible}
              >
                <Feather name="award" size={16} color={colors.primaryBlue} />
                <Text style={styles.leaderboardPromptText}>
                  {missingLeaderboardField
                    ? `Add a ${missingLeaderboardField} to show up on the leaderboard`
                    : "Want to be shown on the leaderboard?"}
                </Text>
                {!missingLeaderboardField && (
                  <Text style={styles.leaderboardPromptAction}>
                    {isTogglingLeaderboardVisible ? "..." : "Turn On"}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {!isOwnProfile && (
              <View style={styles.profileActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    profile.isFollowedByViewer && styles.followButtonActive,
                  ]}
                  onPress={() =>
                    toggleFollow({
                      userId: profile.id,
                      isFollowing: profile.isFollowedByViewer,
                    })
                  }
                  disabled={isTogglingFollow}
                >
                  <Text
                    style={[
                      styles.followButtonText,
                      profile.isFollowedByViewer &&
                        styles.followButtonTextActive,
                    ]}
                  >
                    {profile.isFollowedByViewer ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={() =>
                    createDmConversation(profile.id, {
                      onSuccess: (conversationId) =>
                        router.push(`/messages/${conversationId}`),
                    })
                  }
                  disabled={isStartingConversation}
                >
                  <Feather
                    name="message-circle"
                    size={16}
                    color={colors.primaryBlue}
                  />
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}
            {isOwnProfile && (
              <View style={styles.profileActionsRow}>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => setIsEditProfileOpen(true)}
                >
                  <Feather name="edit-2" size={14} color={colors.primaryBlue} />
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, tab === "workouts" && styles.tabActive]}
              onPress={() => setTab("workouts")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "workouts" && styles.tabTextActive,
                ]}
              >
                Workouts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "nutrition" && styles.tabActive]}
              onPress={() => setTab("nutrition")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "nutrition" && styles.tabTextActive,
                ]}
              >
                Nutrition
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "social" && styles.tabActive]}
              onPress={() => setTab("social")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "social" && styles.tabTextActive,
                ]}
              >
                Social
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "nutrition" && (
            <NutritionMonthCalendar
              loggedDates={
                new Set((nutritionDays ?? []).map((day: PublicNutritionDay) => day.date))
              }
              selectedDate={selectedNutritionDate}
              onSelectDate={setSelectedNutritionDate}
              onMonthChange={(monthKey) => {
                setNutritionMonthKey(monthKey);
                // The previously-selected date almost certainly doesn't
                // exist in the newly-fetched month's data — clearing it
                // avoids showing a stale day's meals under a different
                // month's calendar.
                setSelectedNutritionDate(null);
              }}
            />
          )}

          {tab === "nutrition" && isNutritionLoading && (
            <ActivityIndicator style={{ marginTop: spacing.md }} />
          )}

          {tab === "nutrition" &&
            !isNutritionLoading &&
            (!nutritionDays || nutritionDays.length === 0) && (
              <Text style={styles.emptyText}>No food logged that month.</Text>
            )}

          {tab === "social" && isPostsLoading && (
            <ActivityIndicator style={{ marginTop: spacing.md }} />
          )}

          {tab === "social" && !isPostsLoading && (!posts || posts.length === 0) && (
            <View style={styles.placeholderContainer}>
              <Feather name="users" size={32} color={colors.textSecondary} />
              <Text style={styles.placeholderText}>No posts yet</Text>
            </View>
          )}

          {tab === "social" &&
            !isPostsLoading &&
            posts &&
            posts.length > 0 &&
            posts.map((post: Post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => router.push(`/post/${post.id}`)}
                activeOpacity={0.8}
              >
                {post.caption && (
                  <Text style={styles.postCaption}>{post.caption}</Text>
                )}
                {/* Cloudinary URL — already absolute and publicly
                    servable, unlike profile pictures/exercise GIFs which
                    route through our own authenticated proxy, so no
                    base-URL prefix or auth header here. */}
                {post.mediaUrl && post.mediaType === "video" ? (
                  <SocialPostVideo uri={post.mediaUrl} />
                ) : (
                  post.mediaUrl && (
                    <Image
                      source={{ uri: post.mediaUrl }}
                      style={styles.postMedia}
                      contentFit="cover"
                    />
                  )
                )}
                <View style={styles.postFooterRow}>
                  <View style={styles.postFooterStat}>
                    <Ionicons
                      name={post.isLikedByViewer ? "heart" : "heart-outline"}
                      size={14}
                      color={
                        post.isLikedByViewer
                          ? colors.dangerRed
                          : colors.textSecondary
                      }
                    />
                    <Text style={styles.postFooterStatText}>
                      {post.likeCount}
                    </Text>
                  </View>
                  <View style={styles.postFooterStat}>
                    <Feather
                      name="message-circle"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.postFooterStatText}>
                      {post.commentCount}
                    </Text>
                  </View>
                  <Text style={styles.postFooterDate}>
                    {formatLoggedAt(post.createdAt)}
                  </Text>
                  {isOwnProfile && (
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeletePost(post)}
                    >
                      <Feather
                        name="trash-2"
                        size={14}
                        color={colors.dangerRed}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}

          {tab === "workouts" && (isProgramLoading || isHistoryLoading) && (
            <ActivityIndicator style={{ marginTop: spacing.md }} />
          )}

          {tab === "workouts" &&
            !isProgramLoading &&
            !isHistoryLoading &&
            !activeProgram &&
            (!workoutLogs || workoutLogs.length === 0) && (
              <Text style={styles.emptyText}>No workouts logged yet.</Text>
            )}

          {tab === "workouts" && !isProgramLoading && activeProgram && (
            <>
              <Text style={styles.sectionLabel}>Current Program</Text>
              <Text style={styles.programName}>{activeProgram.name}</Text>
              {activeProgram.weeks.map((week: ProgramWeek) => (
                <View key={week.id} style={styles.weekBlock}>
                  <Text style={styles.weekLabel}>Week {week.weekNumber}</Text>
                  <View style={styles.grid}>
                    {week.days.map((day: ProgramDay) => (
                      <View key={day.id} style={styles.gridCard}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.cardTitle}>{day.dayName}</Text>
                          <View
                            style={[
                              styles.badge,
                              day.isRestDay
                                ? styles.badgeMuted
                                : styles.badgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                day.isRestDay
                                  ? styles.badgeTextMuted
                                  : styles.badgeTextActive,
                              ]}
                            >
                              {day.isRestDay ? "Rest" : day.focus}
                            </Text>
                          </View>
                        </View>
                        {!day.isRestDay &&
                          day.exercises.map((exercise: ProgramExercise) => (
                            <View key={exercise.id} style={styles.exerciseLine}>
                              <Text
                                style={styles.exerciseName}
                                numberOfLines={1}
                              >
                                {exercise.exerciseName}
                              </Text>
                              <Text style={styles.setText}>
                                {exercise.sets}x{exercise.reps}
                              </Text>
                            </View>
                          ))}
                        {/* Inheriting only makes sense from someone ELSE's
                            program — copying your own workout into your
                            own schedule is meaningless (and creates real
                            edge cases: the source and target day/program
                            can end up being the exact same one). */}
                        {!isOwnProfile && !day.isRestDay && hasOwnActiveProgram && (
                          <TouchableOpacity
                            style={styles.inheritButton}
                            onPress={() => handleInherit(day)}
                            disabled={isInheriting}
                          >
                            <Feather
                              name="download"
                              size={12}
                              color={colors.primaryBlue}
                            />
                            <Text style={styles.inheritButtonText}>
                              Copy to my schedule
                            </Text>
                          </TouchableOpacity>
                        )}
                        {!isOwnProfile && !day.isRestDay && !hasOwnActiveProgram && (
                          <TouchableOpacity
                            style={styles.inheritButton}
                            onPress={() => handleInheritAsNewProgram(day)}
                          >
                            <Feather
                              name="download"
                              size={12}
                              color={colors.primaryBlue}
                            />
                            <Text style={styles.inheritButtonText}>
                              Inherit Workout
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}

          {tab === "workouts" &&
            !isHistoryLoading &&
            workoutLogs &&
            workoutLogs.length > 0 && (
              <>
                <Text
                  style={[
                    styles.sectionLabel,
                    !!activeProgram && styles.standaloneSectionLabel,
                  ]}
                >
                  {activeProgram ? "Other Logged Workouts" : "Recent Workouts"}
                </Text>
                <View style={styles.grid}>
                  {workoutLogs.map((log: PublicWorkoutLog) => (
                    <View key={log.id} style={styles.gridCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>
                          {formatLoggedAt(log.loggedAt)}
                        </Text>
                        <View style={[styles.badge, styles.badgeActive]}>
                          <Text
                            style={[styles.badgeText, styles.badgeTextActive]}
                          >
                            {log.exercises.length}{" "}
                            {log.exercises.length === 1
                              ? "exercise"
                              : "exercises"}
                          </Text>
                        </View>
                      </View>
                      {log.exercises.map((exercise) => (
                        <View key={exercise.id} style={styles.exerciseBlock}>
                          <Text style={styles.exerciseName} numberOfLines={1}>
                            {exercise.exerciseName}
                          </Text>
                          <Text style={styles.setSummary} numberOfLines={1}>
                            {exercise.sets
                              .map(
                                (set) =>
                                  `${set.weight != null ? `${set.weight}lb×` : ""}${set.reps ?? "-"}`,
                              )
                              .join(", ")}
                          </Text>
                        </View>
                      ))}
                      {!isOwnProfile && (
                        <TouchableOpacity
                          style={styles.inheritButton}
                          onPress={() => handleInheritLogAsNewProgram(log)}
                        >
                          <Feather
                            name="download"
                            size={12}
                            color={colors.primaryBlue}
                          />
                          <Text style={styles.inheritButtonText}>
                            Inherit Workout
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
        </ScrollView>
      )}

      {/* Toast positions itself "top: 24" from its nearest positioned
          ancestor — on tab screens that's below the navigator-provided
          header, but this screen draws its own back-button header row
          inside this same SafeAreaView, so the toast would otherwise land
          on top of / behind it. This wrapper pushes it down to clear that
          header specifically on this screen. */}
      <View style={styles.toastAnchor} pointerEvents="box-none">
        <Toast
          visible={!!toastMessage}
          message={toastMessage ?? ""}
          onHide={() => setToastMessage(null)}
        />
      </View>

      <InheritDatePickerModal
        visible={!!pendingInheritSource}
        onClose={() => setPendingInheritSource(null)}
        onConfirm={handleConfirmInheritDate}
        isSubmitting={isSchedulingInherit}
      />

      <EditProfileModal
        visible={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSaved={() => setToastMessage("Profile updated")}
      />

      <Modal
        visible={!!selectedNutritionDate}
        onClose={() => setSelectedNutritionDate(null)}
      >
        {selectedNutritionDay && (
          <View>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>
                {formatLoggedAt(selectedNutritionDay.date)}
              </Text>
              <Text style={styles.nutritionCalories}>
                {Math.round(selectedNutritionDay.totals.calories)} cal
              </Text>
            </View>
            <Text style={styles.nutritionMacros}>
              {Math.round(selectedNutritionDay.totals.proteinG)}g protein ·{" "}
              {Math.round(selectedNutritionDay.totals.carbsG)}g carbs ·{" "}
              {Math.round(selectedNutritionDay.totals.fatG)}g fat
            </Text>
            {MEAL_TYPES.map((mealType) =>
              selectedNutritionDay.meals[mealType].length > 0 ? (
                <View key={mealType} style={styles.mealBlock}>
                  <Text style={styles.mealLabel}>
                    {MEAL_TYPE_LABELS[mealType]}
                  </Text>
                  {selectedNutritionDay.meals[mealType].map(
                    (entry: PublicNutritionEntry) => (
                      <View key={entry.id} style={styles.exerciseLine}>
                        <Text style={styles.exerciseName} numberOfLines={1}>
                          {entry.foodName}
                        </Text>
                        <Text style={styles.setText}>
                          {Math.round(entry.calories)} cal
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              ) : null,
            )}
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

export default UserProfileScreen;

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
  toastAnchor: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
    gap: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  followStatsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  followStat: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  followStatCount: {
    fontWeight: fontWeights.bold,
    color: "#000",
  },
  profileActionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  followButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.primaryBlue,
  },
  followButtonActive: {
    backgroundColor: colors.surfaceGrayLight,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  followButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: "white",
  },
  followButtonTextActive: {
    color: colors.textSecondary,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surfaceBlueLight,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
  },
  messageButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderGray,
    flex: 1,
  },
  editProfileButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  leaderboardPromptBanner: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceBlueLight,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
  },
  leaderboardPromptText: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
  },
  leaderboardPromptAction: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.extrabold,
    color: colors.primaryBlue,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: "#000",
  },
  placeholderContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  postCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  postCaption: {
    fontSize: fontSizes.sm,
    color: "#000",
  },
  postMedia: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.lightGraySoft,
  },
  postFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  postFooterStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  postFooterStatText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  postFooterDate: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginLeft: "auto",
  },
  nutritionDayCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  nutritionCalories: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  nutritionMacros: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  mealBlock: {
    marginTop: spacing.xs,
    gap: 4,
  },
  mealLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  standaloneSectionLabel: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  programName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  weekBlock: {
    marginBottom: spacing.lg,
  },
  weekLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    width: "48%",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    flexShrink: 1,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeActive: {
    backgroundColor: colors.surfaceBlueLight,
  },
  badgeMuted: {
    backgroundColor: colors.lightGraySoft,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    textTransform: "uppercase",
  },
  badgeTextActive: {
    color: colors.primaryBlue,
  },
  badgeTextMuted: {
    color: colors.textSecondary,
  },
  exerciseLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  inheritButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    backgroundColor: colors.surfaceBlueLight,
    borderRadius: 6,
    paddingVertical: 6,
    marginTop: 6,
  },
  inheritButtonText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
  },
  exerciseBlock: {
    marginBottom: 2,
  },
  exerciseName: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    flexShrink: 1,
  },
  setText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  setSummary: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
