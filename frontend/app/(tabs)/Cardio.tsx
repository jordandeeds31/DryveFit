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
import Ionicons from "@expo/vector-icons/Ionicons";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { useCardioSessions } from "@/hooks/useCardio";
import { CardioActivityType, CardioSessionSummary } from "@/types/cardio.types";

const METERS_PER_MILE = 1609.344;

const ACTIVITY_OPTIONS: { type: CardioActivityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "walk", label: "Walk", icon: "walk" },
  { type: "run", label: "Run", icon: "footsteps" },
  { type: "bike", label: "Bike", icon: "bicycle" },
];

const formatMiles = (meters: number): string => (meters / METERS_PER_MILE).toFixed(2);

const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
};

const formatSessionDate = (dateStr: string) =>
  formatCalendarDate(dateStr, { weekday: "short", month: "short", day: "numeric" });

const CardioScreen = () => {
  const { data: sessions, isLoading, error } = useCardioSessions();

  const handleStart = (activityType: CardioActivityType) => {
    router.push({ pathname: "/cardio-session", params: { activityType } });
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Cardio</Text>
        <Text style={styles.subtitle}>
          Track a walk, run, or ride — distance, route, and calories.
        </Text>

        <View style={styles.startRow}>
          {ACTIVITY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={styles.startButton}
              onPress={() => handleStart(option.type)}
            >
              <Ionicons name={option.icon} size={22} color={colors.primaryBlue} />
              <Text style={styles.startButtonText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>History</Text>

        {isLoading && (
          <ActivityIndicator
            style={{ marginTop: spacing.md }}
            color={colors.primaryBlue}
          />
        )}

        {!isLoading && error && (
          <Text style={styles.emptyText}>Couldn't load your activity history.</Text>
        )}

        {!isLoading && !error && sessions && sessions.length === 0 && (
          <Text style={styles.emptyText}>
            No activities logged yet. Start one above!
          </Text>
        )}

        {!isLoading &&
          !error &&
          sessions?.map((session: CardioSessionSummary) => {
            const activityOption = ACTIVITY_OPTIONS.find(
              (option) => option.type === session.activityType,
            );
            return (
              <TouchableOpacity
                key={session.id}
                style={styles.row}
                onPress={() => router.push(`/cardio/${session.id}`)}
              >
                <View style={styles.rowIcon}>
                  <Ionicons
                    name={activityOption?.icon ?? "walk"}
                    size={20}
                    color={colors.primaryBlue}
                  />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>
                    {activityOption?.label ?? "Activity"} ·{" "}
                    {formatSessionDate(session.startedAt)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatMiles(session.distanceMeters)} mi ·{" "}
                    {formatDuration(session.durationSeconds)}
                    {session.caloriesBurned != null
                      ? ` · ${session.caloriesBurned} cal`
                      : ""}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default CardioScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: "#000",
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  startRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  startButton: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderGray,
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  startButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primaryBlue,
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: "#000",
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderGray,
    backgroundColor: colors.surfaceGrayLight,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: "#000",
  },
  rowMeta: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
