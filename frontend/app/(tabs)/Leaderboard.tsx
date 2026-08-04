import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import { Exercise } from "@/types/exercise.types";
import { LeaderboardEntry } from "@/types/leaderboard.types";
import { useCurrentUser } from "@/hooks/useUsers";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";

type Scope = "city" | "global";

const PAGE_SIZE = 20;

const LeaderboardScreen = () => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [scope, setScope] = useState<Scope>("global");
  const [page, setPage] = useState(0);

  const { data: currentUser } = useCurrentUser();
  const authImageHeaders = useAuthImageHeaders();
  const { data: leaderboard, isLoading, error } = useLeaderboard(
    selectedExercise?.name ?? null,
    scope,
  );

  // A new exercise/scope means a whole new results set — always start
  // back at the top rather than stranding the user on a page that may no
  // longer exist.
  useEffect(() => {
    setPage(0);
  }, [selectedExercise?.name, scope]);

  const totalPages = leaderboard
    ? Math.max(1, Math.ceil(leaderboard.entries.length / PAGE_SIZE))
    : 1;
  const paginatedEntries =
    leaderboard?.entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) ??
    [];

  const hasCity = !!currentUser?.city;
  const hasUsername = !!currentUser?.username;

  const scopeLabel = !selectedExercise
    ? null
    : leaderboard
      ? leaderboard.scope === "city" && leaderboard.city
        ? `Showing ${leaderboard.city}`
        : "Showing all users"
      : null;

  const currentUserEntry =
    leaderboard?.entries.find(
      (entry: LeaderboardEntry) => entry.isCurrentUser,
    ) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {selectedExercise?.name ?? "Leaderboard"}
        </Text>
        <Text style={styles.subtitle}>
          See how your estimated one-rep max for an exercise stacks up
          against other users. Pick an exercise below to get started.
        </Text>
        {scopeLabel && <Text style={styles.scopeLabel}>{scopeLabel}</Text>}

        <DropdownExerciseSelect
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
        />

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              scope === "global" && styles.segmentActive,
            ]}
            onPress={() => setScope("global")}
          >
            <Text
              style={[
                styles.segmentText,
                scope === "global" && styles.segmentTextActive,
              ]}
            >
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              scope === "city" && styles.segmentActive,
              !hasCity && styles.segmentDisabled,
            ]}
            onPress={() => hasCity && setScope("city")}
            disabled={!hasCity}
          >
            <Text
              style={[
                styles.segmentText,
                scope === "city" && styles.segmentTextActive,
              ]}
            >
              My City
            </Text>
          </TouchableOpacity>
        </View>
        {!hasCity && (
          <Text style={styles.hintText}>
            Set your city in Profile to use the city leaderboard.
          </Text>
        )}

        {!hasUsername && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => router.push("/(tabs)/Profile")}
          >
            <Text style={styles.bannerText}>
              Set a username in your Profile to appear on the leaderboard.
            </Text>
          </TouchableOpacity>
        )}

        {isLoading && <ActivityIndicator style={{ marginTop: spacing.md }} />}

        {!isLoading && error && selectedExercise && (
          <Text style={styles.emptyText}>
            Couldn't load the leaderboard. Try switching scope or pick a
            different exercise.
          </Text>
        )}

        {!isLoading &&
          !error &&
          leaderboard &&
          leaderboard.entries.length === 0 && (
            <Text style={styles.emptyText}>
              No rankings yet for {selectedExercise?.name}. Log a set to be
              the first!
            </Text>
          )}

        {!isLoading &&
          !error &&
          leaderboard &&
          leaderboard.entries.length > 0 && (
            <View style={styles.list}>
              {paginatedEntries.map((entry: LeaderboardEntry) => (
                <View
                  key={entry.rank}
                  style={[
                    styles.row,
                    entry.isCurrentUser && styles.rowCurrentUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.rank,
                      entry.isCurrentUser && styles.textCurrentUser,
                    ]}
                  >
                    #{entry.rank}
                  </Text>
                  {entry.profileImageUrl ? (
                    <Image
                      source={{
                        uri: `${process.env.EXPO_PUBLIC_API_URL}${entry.profileImageUrl}`,
                        headers: authImageHeaders,
                      }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Feather
                        name="user"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.username,
                      entry.isCurrentUser && styles.textCurrentUser,
                    ]}
                  >
                    {entry.username}
                  </Text>
                  <Text
                    style={[
                      styles.weight,
                      entry.isCurrentUser && styles.textCurrentUser,
                    ]}
                  >
                    {entry.estimated1RM} lbs
                  </Text>
                </View>
              ))}
            </View>
          )}
      </ScrollView>

      {(totalPages > 1 || currentUserEntry) && (
        <View style={styles.footer}>
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                onPress={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
              >
                <Feather
                  name="chevron-left"
                  size={22}
                  color={page === 0 ? colors.textMuted : colors.primaryBlue}
                />
              </TouchableOpacity>
              <Text style={styles.paginationText}>
                Page {page + 1} of {totalPages}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setPage((prev) => Math.min(totalPages - 1, prev + 1))
                }
                disabled={page >= totalPages - 1}
              >
                <Feather
                  name="chevron-right"
                  size={22}
                  color={
                    page >= totalPages - 1
                      ? colors.textMuted
                      : colors.primaryBlue
                  }
                />
              </TouchableOpacity>
            </View>
          )}

          {currentUserEntry && (
            <View style={styles.yourRankBar}>
              <Text style={styles.yourRankLabel}>YOUR RANK</Text>
              <Text style={styles.yourRankValue}>
                #{currentUserEntry.rank}
              </Text>
              <Text style={styles.yourRankWeight}>
                {currentUserEntry.estimated1RM} lbs
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    flexGrow: 1,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  scopeLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  segmentedControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.surfaceBlueLight,
  },
  segmentDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primaryBlue,
  },
  hintText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  banner: {
    backgroundColor: colors.surfaceBlueLight,
    borderWidth: 1,
    borderColor: colors.borderBlueLight,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  bannerText: {
    fontSize: fontSizes.sm,
    color: colors.primaryBlue,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 6,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  paginationText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowCurrentUser: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
  rank: {
    width: 40,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.xs,
    backgroundColor: colors.lightGraySoft,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: spacing.xs,
    backgroundColor: colors.lightGraySoft,
    borderWidth: 1,
    borderColor: colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    flex: 1,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  weight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
  },
  textCurrentUser: {
    color: colors.primaryBlue,
  },
  yourRankBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  yourRankLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: "white",
    opacity: 0.8,
  },
  yourRankValue: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.extrabold,
    color: "white",
  },
  yourRankWeight: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: "white",
  },
});
