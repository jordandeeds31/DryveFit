import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/constants/spacing";
import { colors } from "@/constants/colors";
import { fontSizes, fontWeights } from "@/constants/typography";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import Graph from "@/features/Graph/Graph";
import { Exercise } from "@/types/exercise.types";
import { use1RMHistory } from "@/hooks/useExercises";

const PersonalRecordProgress = () => {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );

  const { data: history, isLoading } = use1RMHistory(
    selectedExercise?.name ?? null,
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>PR Progress</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default PersonalRecordProgress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
