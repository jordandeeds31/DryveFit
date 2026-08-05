import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { fontSizes, fontWeights } from "@/constants/typography";
import { formatElapsed } from "@/lib/utils/duration.utils";

interface ExerciseRecap {
  exerciseName: string;
  durationSecs: number | null;
}

const WorkoutRecap = () => {
  const {
    totalDurationSecs,
    caloriesBurned,
    avgHeartRate,
    maxHeartRate,
    perExercise,
  } = useLocalSearchParams<{
    totalDurationSecs: string;
    caloriesBurned: string;
    avgHeartRate: string;
    maxHeartRate: string;
    perExercise: string;
  }>();

  const exercises: ExerciseRecap[] = perExercise
    ? JSON.parse(perExercise)
    : [];
  const calories = Number(caloriesBurned ?? "0");
  const hasHealthData = calories > 0 || !!avgHeartRate || !!maxHeartRate;

  const handleDone = () => {
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={32} color="#0B0F19" />
        </View>
        <Text style={styles.title}>Workout Complete</Text>
        <Text style={styles.totalTime}>
          {formatElapsed(Number(totalDurationSecs ?? "0"))}
        </Text>
        <Text style={styles.totalTimeLabel}>total time</Text>

        {hasHealthData && (
          <View style={styles.statsRow}>
            {calories > 0 && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{calories}</Text>
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
        )}

        {exercises.length > 0 && (
          <View style={styles.exerciseSection}>
            <Text style={styles.sectionLabel}>Exercise Breakdown</Text>
            {exercises.map((ex, index) => (
              <View key={`${ex.exerciseName}-${index}`} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseDuration}>
                  {ex.durationSecs != null
                    ? formatElapsed(ex.durationSecs)
                    : "--"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>DONE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default WorkoutRecap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
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
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    color: "white",
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  totalTime: {
    color: "white",
    fontSize: fontSizes["4xl"],
    fontWeight: fontWeights.extrabold,
    marginTop: spacing.lg,
    fontVariant: ["tabular-nums"],
  },
  totalTimeLabel: {
    color: "#9CA3AF",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  statBox: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    color: "white",
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  statLabel: {
    color: "#9CA3AF",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  exerciseSection: {
    width: "100%",
    marginTop: spacing.xl,
  },
  sectionLabel: {
    color: "#9CA3AF",
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    paddingVertical: spacing.sm,
  },
  exerciseName: {
    color: "white",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  exerciseDuration: {
    color: "#9CA3AF",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    fontVariant: ["tabular-nums"],
  },
  doneButton: {
    backgroundColor: "white",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#0B0F19",
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
});
