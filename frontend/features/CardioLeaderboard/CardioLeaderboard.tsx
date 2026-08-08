import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { useCurrentUser } from "@/hooks/useUsers";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { useCardioLeaderboard } from "@/hooks/useCardioLeaderboard";
import { CardioActivityType } from "@/types/cardio.types";
import {
  CardioLeaderboardCategory,
  CardioLeaderboardEntry,
} from "@/types/cardioLeaderboard.types";

type Gender = "male" | "female";

const PAGE_SIZE = 20;
const METERS_PER_MILE = 1609.344;
const MPS_TO_MPH = 2.23694;

const ACTIVITY_OPTIONS: { type: CardioActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "walk", label: "Walk", icon: "walk" },
  { type: "run", label: "Run", icon: "footsteps" },
  { type: "bike", label: "Bike", icon: "bicycle" },
];

const CATEGORIES: { value: CardioLeaderboardCategory; label: string }[] = [
  { value: "steps-best-day", label: "Steps (Best Day)" },
  { value: "steps-all-time", label: "Steps (All-Time)" },
  { value: "calories-best-day", label: "Calories (Best Day)" },
  { value: "calories-all-time", label: "Calories (All-Time)" },
  { value: "best-pace", label: "Best Pace" },
];

// "Best pace" is stored server-side as a raw speed (meters/second) so one
// query works for all three activities — this turns it into whatever reads
// naturally per activity: pace (min/mi) for walk/run, mph for bike.
const formatEntryValue = (
  category: CardioLeaderboardCategory,
  activityType: CardioActivityType,
  value: number,
): string => {
  if (category === "best-pace") {
    if (activityType === "bike") {
      return `${(value * MPS_TO_MPH).toFixed(1)} mph`;
    }
    const paceSecondsPerMile = METERS_PER_MILE / value;
    const minutes = Math.floor(paceSecondsPerMile / 60);
    const seconds = Math.round(paceSecondsPerMile % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")} /mi`;
  }

  const suffix = category.startsWith("steps") ? "steps" : "cal";
  return `${Math.round(value).toLocaleString()} ${suffix}`;
};

export interface CardioYourRank {
  rank: number;
  value: string;
}

interface CardioLeaderboardProps {
  // The rank bar itself is rendered by the parent screen as a fixed footer
  // (matching the lifting leaderboard's), since this component is embedded
  // inside that screen's ScrollView and can't pin itself to the viewport.
  onYourRankChange?: (rank: CardioYourRank | null) => void;
}

const CardioLeaderboard = ({ onYourRankChange }: CardioLeaderboardProps) => {
  const [activityType, setActivityType] = useState<CardioActivityType>("walk");
  const [category, setCategory] = useState<CardioLeaderboardCategory>(
    "steps-best-day",
  );
  const [gender, setGender] = useState<Gender>("male");
  const [page, setPage] = useState(0);

  const { data: currentUser } = useCurrentUser();
  const authImageHeaders = useAuthImageHeaders();
  const { data: leaderboard, isLoading, error } = useCardioLeaderboard(
    activityType,
    category,
    gender,
  );

  useEffect(() => {
    if (currentUser?.gender) setGender(currentUser.gender);
  }, [currentUser?.gender]);

  useEffect(() => {
    setPage(0);
  }, [activityType, category, gender]);

  const needsLeaderboardIdentity = !currentUser?.username || !currentUser?.city;
  const hasGender = !!currentUser?.gender;

  const totalPages = leaderboard
    ? Math.max(1, Math.ceil(leaderboard.entries.length / PAGE_SIZE))
    : 1;
  const paginatedEntries =
    leaderboard?.entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) ??
    [];

  const currentUserEntry =
    leaderboard?.entries.find(
      (entry: CardioLeaderboardEntry) => entry.isCurrentUser,
    ) ?? null;

  useEffect(() => {
    onYourRankChange?.(
      currentUserEntry
        ? {
            rank: currentUserEntry.rank,
            value: formatEntryValue(category, activityType, currentUserEntry.value),
          }
        : null,
    );
    // Clear it on unmount too, e.g. switching from Cardio back to Lifting.
    return () => onYourRankChange?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserEntry?.rank, currentUserEntry?.value, category, activityType]);

  return (
    <View>
      <View style={styles.segmentedControl}>
        {ACTIVITY_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.segment,
              activityType === option.type && styles.segmentActive,
            ]}
            onPress={() => setActivityType(option.type)}
          >
            <Ionicons
              name={option.icon}
              size={16}
              color={
                activityType === option.type
                  ? colors.primaryBlue
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.segmentText,
                activityType === option.type && styles.segmentTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.chip, category === cat.value && styles.chipActive]}
            onPress={() => setCategory(cat.value)}
          >
            <Text
              style={[
                styles.chipText,
                category === cat.value && styles.chipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.segmentedControl, styles.genderSegmentedControl]}>
        <TouchableOpacity
          style={[styles.segment, gender === "male" && styles.segmentActive]}
          onPress={() => setGender("male")}
        >
          <Text
            style={[
              styles.segmentText,
              gender === "male" && styles.segmentTextActive,
            ]}
          >
            Men
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, gender === "female" && styles.segmentActive]}
          onPress={() => setGender("female")}
        >
          <Text
            style={[
              styles.segmentText,
              gender === "female" && styles.segmentTextActive,
            ]}
          >
            Women
          </Text>
        </TouchableOpacity>
      </View>

      {!hasGender && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push("/(tabs)/Profile")}
        >
          <Text style={styles.bannerText}>
            Set your gender in Profile to appear on the Men's or Women's
            leaderboard.
          </Text>
        </TouchableOpacity>
      )}

      {needsLeaderboardIdentity && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push("/(tabs)/Profile")}
        >
          <Text style={styles.bannerText}>
            If you want to show up on the leaderboard, set a username and
            city in Profile.
          </Text>
        </TouchableOpacity>
      )}

      {isLoading && <ActivityIndicator style={{ marginTop: spacing.md }} />}

      {!isLoading && error && (
        <Text style={styles.emptyText}>
          Couldn't load the leaderboard. Try switching category or activity.
        </Text>
      )}

      {!isLoading &&
        !error &&
        leaderboard &&
        leaderboard.entries.length === 0 && (
          <Text style={styles.emptyText}>
            No rankings yet for this category. Finish an activity to be the
            first!
          </Text>
        )}

      {!isLoading &&
        !error &&
        leaderboard &&
        leaderboard.entries.length > 0 && (
          <View style={styles.list}>
            {paginatedEntries.map((entry: CardioLeaderboardEntry) => (
              <TouchableOpacity
                key={entry.rank}
                style={[
                  styles.row,
                  entry.isCurrentUser && styles.rowCurrentUser,
                ]}
                onPress={() =>
                  !entry.isCurrentUser && router.push(`/user/${entry.id}`)
                }
                disabled={entry.isCurrentUser}
              >
                <Text
                  style={[
                    styles.rank,
                    entry.isCurrentUser && styles.textCurrentUser,
                  ]}
                >
                  #{entry.rank}
                </Text>
                {entry.profileImageUrl && authImageHeaders ? (
                  <Image
                    source={{
                      uri: `${process.env.EXPO_PUBLIC_API_URL}${entry.profileImageUrl}`,
                      headers: authImageHeaders,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Feather name="user" size={14} color={colors.textSecondary} />
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
                    styles.value,
                    entry.isCurrentUser && styles.textCurrentUser,
                  ]}
                >
                  {formatEntryValue(category, activityType, entry.value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

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
            onPress={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={page >= totalPages - 1}
          >
            <Feather
              name="chevron-right"
              size={22}
              color={page >= totalPages - 1 ? colors.textMuted : colors.primaryBlue}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CardioLeaderboard;

const styles = StyleSheet.create({
  segmentedControl: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  genderSegmentedControl: {
    marginTop: spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.surfaceBlueLight,
  },
  segmentText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primaryBlue,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 16,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.surfaceBlueLight,
    borderColor: colors.borderBlueLight,
  },
  chipText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primaryBlue,
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
  value: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.completedGreen,
  },
  textCurrentUser: {
    color: colors.primaryBlue,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  paginationText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
  },
});
