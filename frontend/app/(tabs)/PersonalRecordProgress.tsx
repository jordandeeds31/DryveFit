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
        <DropdownExerciseSelect
          selectedExercise={selectedExercise}
          setSelectedExercise={setSelectedExercise}
        />

        {isLoading && <ActivityIndicator style={{ marginTop: spacing.md }} />}

        {!isLoading && selectedExercise && history && history.length === 0 && (
          <Text style={{ marginTop: spacing.md }}>
            No logged history yet for {selectedExercise.name}.
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
});
