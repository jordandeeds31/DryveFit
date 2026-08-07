import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatElapsed } from "@/lib/utils/duration.utils";
import { CardioActivityType } from "@/types/cardio.types";

const METERS_PER_MILE = 1609.344;

const ACTIVITY_LABELS: Record<CardioActivityType, string> = {
  walk: "Walk",
  run: "Run",
  bike: "Bike Ride",
};

const formatPace = (meters: number, durationSecs: number): string => {
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.05 || durationSecs < 10) return "--:--";
  const paceSecondsPerMile = durationSecs / miles;
  const minutes = Math.floor(paceSecondsPerMile / 60);
  const seconds = Math.round(paceSecondsPerMile % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const CardioRecap = () => {
  const {
    activityType,
    durationSecs,
    distanceMeters,
    caloriesBurned,
    avgHeartRate,
    maxHeartRate,
  } = useLocalSearchParams<{
    activityType: CardioActivityType;
    durationSecs: string;
    distanceMeters: string;
    caloriesBurned: string;
    avgHeartRate: string;
    maxHeartRate: string;
  }>();

  const duration = Number(durationSecs ?? "0");
  const distance = Number(distanceMeters ?? "0");
  const miles = distance / METERS_PER_MILE;

  const handleDone = () => {
    router.replace("/(tabs)/Cardio");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={32} color="white" />
        </View>
        <Text style={styles.title}>
          {ACTIVITY_LABELS[activityType ?? "walk"].toUpperCase()} COMPLETE
        </Text>
        <Text style={styles.totalTime}>{formatElapsed(duration)}</Text>
        <Text style={styles.totalTimeLabel}>total time</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{miles.toFixed(2)}</Text>
            <Text style={styles.statLabel}>miles</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatPace(distance, duration)}</Text>
            <Text style={styles.statLabel}>pace /mi</Text>
          </View>
          {!!caloriesBurned && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{caloriesBurned}</Text>
              <Text style={styles.statLabel}>calories</Text>
            </View>
          )}
          {!!avgHeartRate && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{avgHeartRate}</Text>
              <Text style={styles.statLabel}>avg bpm</Text>
            </View>
          )}
          {!!maxHeartRate && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{maxHeartRate}</Text>
              <Text style={styles.statLabel}>max bpm</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>DONE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default CardioRecap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.completedGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: "#000",
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
  },
  totalTime: {
    color: "#000",
    fontSize: fontSizes["4xl"],
    fontWeight: fontWeights.extrabold,
    marginTop: spacing.lg,
    fontVariant: ["tabular-nums"],
  },
  totalTimeLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statBox: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: colors.primaryBlue,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  doneButton: {
    backgroundColor: colors.primaryBlue,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
});
