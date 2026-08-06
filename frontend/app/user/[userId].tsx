import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { usePublicProfile, usePublicWorkoutHistory } from "@/hooks/useUsers";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { PublicWorkoutLog } from "@/types/user.types";

const formatLoggedAt = (dateStr: string) =>
  formatCalendarDate(dateStr, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const UserProfileScreen = () => {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const authImageHeaders = useAuthImageHeaders();

  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
  } = usePublicProfile(userId ?? null);
  const { data: workoutLogs, isLoading: isHistoryLoading } =
    usePublicWorkoutHistory(userId ?? null);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
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
          </View>

          <Text style={styles.sectionLabel}>Recent Workouts</Text>

          {isHistoryLoading && (
            <ActivityIndicator style={{ marginTop: spacing.md }} />
          )}

          {!isHistoryLoading &&
            workoutLogs &&
            workoutLogs.length === 0 && (
              <Text style={styles.emptyText}>
                No workouts logged yet.
              </Text>
            )}

          {!isHistoryLoading &&
            workoutLogs?.map((log: PublicWorkoutLog) => (
              <View key={log.id} style={styles.workoutCard}>
                <Text style={styles.workoutDate}>
                  {formatLoggedAt(log.loggedAt)}
                </Text>
                {log.exercises.map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseRow}>
                    <Text style={styles.exerciseName}>
                      {exercise.exerciseName}
                    </Text>
                    {exercise.sets.map((set) => (
                      <Text key={set.setNumber} style={styles.setText}>
                        Set {set.setNumber}:{" "}
                        {set.weight != null ? `${set.weight} lbs x ` : ""}
                        {set.reps ?? "-"} reps
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ))}
        </ScrollView>
      )}
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
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
  username: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  workoutCard: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  workoutDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primaryBlue,
    marginBottom: spacing.xs,
  },
  exerciseRow: {
    marginBottom: spacing.xs,
  },
  exerciseName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  setText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
});
