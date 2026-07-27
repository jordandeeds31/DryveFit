import { useEffect, useState } from "react";
import styles from "./WorkoutDetail.styles";
import { View, Text, ActivityIndicator } from "react-native";
import { WorkoutDetailProps } from "./WorkoutDetail.types";
import Button from "@/components/shared/Button/Button";
import LogExerciseModal from "../LogExerciseModal/LogExerciseModal";
import { SetEntry } from "../LogExerciseModal/LogExercise.types";
import { ProgramExercise } from "@/types/programs.types";

const buildInitialSetsByExercise = (
  exercises: ProgramExercise[] | undefined,
): Record<string, SetEntry[]> => {
  if (!exercises) return {};

  const result: Record<string, SetEntry[]> = {};

  for (const exercise of exercises) {
    const existingLog = exercise.exerciseLogs?.[0];
    if (existingLog) {
      result[exercise.id] = existingLog.sets.map((set) => ({
        id: set.id,
        weight: set.weight?.toString() ?? "",
        reps: set.reps?.toString() ?? "",
      }));
    }
  }

  return result;
};

const WorkoutDetail = ({ dayDetail, isLoading }: WorkoutDetailProps) => {
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );

  const [setsByExercise, setSetsByExercise] = useState<
    Record<string, SetEntry[]>
  >(() => buildInitialSetsByExercise(dayDetail?.exercises));

  useEffect(() => {
    setSetsByExercise(buildInitialSetsByExercise(dayDetail?.exercises));
  }, [dayDetail?.id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  const handleLogPress = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    setLogModalVisible(true);
  };

  const handleCloseModal = () => {
    setLogModalVisible(false);
  };

  const handleSetsChange = (exerciseId: string, sets: SetEntry[]) => {
    setSetsByExercise((prev) => ({ ...prev, [exerciseId]: sets }));
  };

  const selectedExercise = dayDetail?.exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.focus}>{dayDetail?.focus}</Text>
      {dayDetail?.exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.sets} sets x {exercise.reps} reps
          </Text>
          <Button
            title="LOG"
            style={{ width: 70, height: 30, paddingVertical: 4 }}
            textStyle={{ fontSize: 12 }}
            onPress={() => handleLogPress(exercise.id)}
          />
        </View>
      ))}
      {selectedExercise && (
        <LogExerciseModal
          visible={logModalVisible}
          onClose={handleCloseModal}
          exercise={selectedExercise}
          sets={setsByExercise[selectedExercise.id] ?? []}
          onSetsChange={(sets) => handleSetsChange(selectedExercise.id, sets)}
        />
      )}
    </View>
  );
};

export default WorkoutDetail;
