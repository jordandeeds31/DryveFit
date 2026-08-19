import { useState } from "react";
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
import { useDispatch } from "react-redux";
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
} from "@/hooks/useUsers";
import { usePrograms, useInheritWorkoutDay } from "@/hooks/usePrograms";
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
import type { AppDispatch } from "@/store";
import { setPendingWorkout } from "@/store/slices/pendingWorkoutSlice";

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
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const authImageHeaders = useAuthImageHeaders();
  const [tab, setTab] = useState<ProfileTab>("workouts");

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = usePublicProfile(userId ?? null);
  const { data: workoutLogs, isLoading: isHistoryLoading } =
    usePublicWorkoutHistory(userId ?? null);
  const { data: activeProgram, isLoading: isProgramLoading } =
    usePublicActiveProgram(userId ?? null);
  const { data: nutritionDays, isLoading: isNutritionLoading } =
    usePublicNutritionHistory(userId ?? null);
  const { data: posts, isLoading: isPostsLoading } = usePublicPosts(
    userId ?? null,
  );
  const { mutate: toggleFollow, isPending: isTogglingFollow } =
    useToggleFollow();
  const { mutate: createDmConversation, isPending: isStartingConversation } =
    useCreateDmConversation();
  const { mutate: inheritWorkoutDay, isPending: isInheriting } =
    useInheritWorkoutDay();
  const { data: ownPrograms } = usePrograms();
  const dispatch = useDispatch<AppDispatch>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inheriting means overriding an existing program's schedule — with no
  // program of their own to override, there's nothing to slot this into,
  // so the day's exercises go to the standalone Log Workout flow instead
  // (see handleLogAsStandalone below).
  const hasOwnActiveProgram = !!ownPrograms?.some(
    (program: Program) => program.isActive,
  );

  const performInherit = (day: ProgramDay, force: boolean) => {
    inheritWorkoutDay(
      { dayId: day.id, force },
      {
        onSuccess: (data: { updatedCount: number }) =>
          setToastMessage(
            `Copied to your ${day.dayName} (${data.updatedCount} ${data.updatedCount === 1 ? "week" : "weeks"})`,
          ),
        onError: (error: unknown) => {
          const typedError = error as { status?: number; message?: string };
          // A conflict (409) means this would double up a muscle group
          // with the day before/after in the viewer's own schedule — not
          // a hard failure, just needs a second, more specific
          // confirmation before overriding anyway.
          if (typedError?.status === 409) {
            Alert.alert(
              "Heads up",
              `${typedError.message ?? "This overlaps with your existing schedule."} Copy anyway?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Copy Anyway",
                  onPress: () => performInherit(day, true),
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

  const handleLogAsStandalone = async (day: ProgramDay) => {
    const granted = await ensureProAccess();
    if (!granted) return;

    Alert.alert(
      "Log this workout?",
      `You don't have an active program, so this will open Log Workout pre-filled with ${profile?.username ?? "their"}'s ${day.focus} exercises for you to fill in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log It",
          onPress: () => {
            dispatch(
              setPendingWorkout(
                day.exercises.map((exercise) => ({
                  exerciseName: exercise.exerciseName,
                  muscleGroup: exercise.muscleGroup,
                  equipment: exercise.equipment,
                })),
              ),
            );
            router.push("/(tabs)");
          },
        },
      ],
    );
  };

  // Unlike a program day, a standalone log has no recurring weekday slot
  // to inherit into — logging it for yourself is the only thing "copy
  // this" can mean here, regardless of whether you have an active
  // program. Equipment isn't captured on ExerciseLog at all (only
  // exerciseName/muscleGroup), so it goes in as null rather than guessed.
  const handleLogStandaloneWorkout = async (log: PublicWorkoutLog) => {
    const granted = await ensureProAccess();
    if (!granted) return;

    Alert.alert(
      "Log this workout?",
      `This will open Log Workout pre-filled with ${profile?.username ?? "their"}'s exercises from this workout for you to fill in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log It",
          onPress: () => {
            dispatch(
              setPendingWorkout(
                log.exercises.map((exercise) => ({
                  exerciseName: exercise.exerciseName,
                  muscleGroup: exercise.muscleGroup,
                  equipment: null,
                })),
              ),
            );
            router.push("/(tabs)");
          },
        },
      ],
    );
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
        <View style={{ width: 26 }} />
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

          {tab === "nutrition" && isNutritionLoading && (
            <ActivityIndicator style={{ marginTop: spacing.md }} />
          )}

          {tab === "nutrition" &&
            !isNutritionLoading &&
            (!nutritionDays || nutritionDays.length === 0) && (
              <Text style={styles.emptyText}>
                No food logged in the last 7 days.
              </Text>
            )}

          {tab === "nutrition" &&
            !isNutritionLoading &&
            nutritionDays &&
            nutritionDays.length > 0 &&
            nutritionDays.map((day: PublicNutritionDay) => (
              <View key={day.date} style={styles.nutritionDayCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>
                    {formatLoggedAt(day.date)}
                  </Text>
                  <Text style={styles.nutritionCalories}>
                    {Math.round(day.totals.calories)} cal
                  </Text>
                </View>
                <Text style={styles.nutritionMacros}>
                  {Math.round(day.totals.proteinG)}g protein ·{" "}
                  {Math.round(day.totals.carbsG)}g carbs ·{" "}
                  {Math.round(day.totals.fatG)}g fat
                </Text>
                {MEAL_TYPES.map((mealType) =>
                  day.meals[mealType].length > 0 ? (
                    <View key={mealType} style={styles.mealBlock}>
                      <Text style={styles.mealLabel}>
                        {MEAL_TYPE_LABELS[mealType]}
                      </Text>
                      {day.meals[mealType].map((entry: PublicNutritionEntry) => (
                        <View key={entry.id} style={styles.exerciseLine}>
                          <Text style={styles.exerciseName} numberOfLines={1}>
                            {entry.foodName}
                          </Text>
                          <Text style={styles.setText}>
                            {Math.round(entry.calories)} cal
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null,
                )}
              </View>
            ))}

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
                        {!day.isRestDay && hasOwnActiveProgram && (
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
                        {!day.isRestDay && !hasOwnActiveProgram && (
                          <TouchableOpacity
                            style={styles.inheritButton}
                            onPress={() => handleLogAsStandalone(day)}
                          >
                            <Feather
                              name="edit-3"
                              size={12}
                              color={colors.primaryBlue}
                            />
                            <Text style={styles.inheritButtonText}>
                              Log this workout
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
                      <TouchableOpacity
                        style={styles.inheritButton}
                        onPress={() => handleLogStandaloneWorkout(log)}
                      >
                        <Feather
                          name="edit-3"
                          size={12}
                          color={colors.primaryBlue}
                        />
                        <Text style={styles.inheritButtonText}>
                          Log this workout
                        </Text>
                      </TouchableOpacity>
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
