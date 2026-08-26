import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import Graph from "@/features/Graph/Graph";
import { Exercise } from "@/types/exercise.types";
import { use1RMHistory } from "@/hooks/useExercises";
import { useCurrentStreak } from "@/hooks/usePrograms";

const PersonalRecordProgress = () => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );

  const { data: history, isLoading } = use1RMHistory(
    selectedExercise?.name ?? null,
  );
  const { data: currentStreak, isLoading: isStreakLoading } =
    useCurrentStreak();

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Personal Record Progress</Text>
        <Text style={styles.subtitle}>
          Track how your estimated one-rep max for an exercise changes over
          time, based on the sets you've logged. Pick an exercise below to
          see its progress.
        </Text>

        <DropdownExerciseSelect
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
        />

        {isLoading && <ActivityIndicator style={{ marginTop: spacing.md }} />}

        {!isLoading && selectedExercise && history && history.length === 0 && (
          <Text style={styles.emptyText}>
            No logged history yet for {selectedExercise.name}. Log a set for
            this exercise from your workout, and your progress will start
            showing up here.
          </Text>
        )}

        {!isLoading && history && history.length > 0 && (
          <Graph history={history} />
        )}

        {!isStreakLoading && currentStreak != null && (
          <View style={styles.streakCard}>
            <View style={styles.streakIconWrap}>
              <Feather name="zap" size={18} color={colors.primaryBlue} />
            </View>
            <View>
              <Text style={styles.streakCount}>
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </Text>
              <Text style={styles.streakLabel}>
                {currentStreak > 0
                  ? "stuck to your plan in a row"
                  : "log today's workout to start a streak"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PersonalRecordProgress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.sm,
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
    marginBottom: spacing.md,
  },
  streakCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    // The explicit "border bottom shadow" look — offset straight down,
    // no blur on the sides, so it reads as a shadow cast under the card
    // rather than a soft ambient glow all the way around it.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  streakIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  streakCount: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.extrabold,
  },
  streakLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
