import { useEffect, useState } from "react";
import styles from "./WorkoutDetail.styles";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { WorkoutDetailProps } from "./WorkoutDetail.types";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import LogExerciseModal from "../LogExerciseModal/LogExerciseModal";
import { SetEntry } from "../LogExerciseModal/LogExercise.types";
import { ProgramExercise } from "@/types/programs.types";
import { useExercises, usePreviousSession } from "@/hooks/useExercises";
import { colors } from "@/constants/colors";

const formatSessionDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

const getLogButtonState = (
  exercise: ProgramExercise,
): { title: string; backgroundColor: string } => {
  const hasLoggedSets = exercise.exerciseLogs.length > 0;

  if (!hasLoggedSets) {
    return { title: "LOG", backgroundColor: colors.primaryBlue };
  }

  if (!exercise.isCompleted) {
    return { title: "IN PROGRESS", backgroundColor: colors.pendingAmber };
  }

  return { title: "LOGGED", backgroundColor: colors.completedGreen };
};

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
    } else if (exercise.recommendedWeight != null) {
      // Pre-fill a suggested starting weight from the AI's recommendation —
      // the user can still edit or add sets before saving.
      result[exercise.id] = [
        {
          id: `${exercise.id}-recommended`,
          weight: exercise.recommendedWeight.toString(),
          reps: "",
        },
      ];
    }
  }

  return result;
};

const WorkoutDetail = ({ dayDetail, isLoading }: WorkoutDetailProps) => {
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null,
  );
  const [descriptionExerciseName, setDescriptionExerciseName] = useState<
    string | null
  >(null);
  const [previousExerciseId, setPreviousExerciseId] = useState<string | null>(
    null,
  );

  const { data: exerciseCatalog } = useExercises();
  const descriptionByName: Record<string, string | null> = {};
  for (const catalogExercise of exerciseCatalog ?? []) {
    descriptionByName[catalogExercise.name] = catalogExercise.description;
  }

  const [setsByExercise, setSetsByExercise] = useState<
    Record<string, SetEntry[]>
  >(() => buildInitialSetsByExercise(dayDetail?.exercises));

  useEffect(() => {
    setSetsByExercise(buildInitialSetsByExercise(dayDetail?.exercises));
    // Depends on the whole dayDetail object, not just its id — a background
    // refetch (e.g. after logging performance elsewhere) can update fields
    // like recommendedWeight on the same day without the id ever changing,
    // and that should still resync the pre-filled set values.
  }, [dayDetail]);

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

  const previousExercise = dayDetail?.exercises.find(
    (exercise) => exercise.id === previousExerciseId,
  );
  const { data: previousSession, isLoading: isPreviousLoading } =
    usePreviousSession(
      previousExercise?.exerciseName ?? null,
      dayDetail?.date,
      !!previousExerciseId,
    );

  return (
    <View style={styles.container}>
      <Text style={styles.focus}>{dayDetail?.focus}</Text>
      {dayDetail?.exercises.map((exercise) => {
        const logButtonState = getLogButtonState(exercise);

        return (
          <View key={exercise.id} style={styles.exerciseRow}>
            <View style={styles.exerciseContent}>
              <View style={styles.exerciseNameRow}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                {descriptionByName[exercise.exerciseName] && (
                  <TouchableOpacity
                    onPress={() =>
                      setDescriptionExerciseName(exercise.exerciseName)
                    }
                  >
                    <Feather
                      name="info"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.exerciseMeta}>
                {exercise.sets} sets x {exercise.reps} reps
              </Text>
              {exercise.recommendedWeight != null && (
                <Text style={styles.recommendedWeight}>
                  Weight: {exercise.recommendedWeight} lbs
                </Text>
              )}
              <View style={styles.cardButtonsRow}>
                <Button
                  title={logButtonState.title}
                  backgroundColor={logButtonState.backgroundColor}
                  style={{
                    alignSelf: "flex-start",
                    height: 30,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                  }}
                  textStyle={{ fontSize: 12 }}
                  onPress={() => handleLogPress(exercise.id)}
                />
                <TouchableOpacity
                  style={styles.checkPreviousButton}
                  onPress={() => setPreviousExerciseId(exercise.id)}
                >
                  <Text style={styles.checkPreviousText}>
                    CHECK PREVIOUS WORKOUT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}
      {selectedExercise && (
        <LogExerciseModal
          visible={logModalVisible}
          onClose={handleCloseModal}
          exercise={selectedExercise}
          sets={setsByExercise[selectedExercise.id] ?? []}
          onSetsChange={(sets) => handleSetsChange(selectedExercise.id, sets)}
        />
      )}
      <Modal
        visible={!!previousExerciseId}
        onClose={() => setPreviousExerciseId(null)}
      >
        <Text style={styles.descriptionModalTitle}>
          {previousExercise?.exerciseName}
        </Text>
        {isPreviousLoading ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : !previousSession ? (
          <Text style={styles.descriptionModalBody}>
            No previous session logged for this exercise yet.
          </Text>
        ) : (
          <>
            <Text style={styles.recommendedWeight}>
              {formatSessionDate(previousSession.date)}
            </Text>
            {previousSession.sets.map((set) => (
              <View key={set.setNumber} style={styles.previousSetRow}>
                <Text style={styles.previousSetLabel}>
                  Set {set.setNumber}
                </Text>
                <Text style={styles.previousSetValue}>
                  {set.weight != null ? `${set.weight} lbs x ` : ""}
                  {set.reps ?? "-"} reps
                </Text>
              </View>
            ))}
          </>
        )}
      </Modal>
      <Modal
        visible={!!descriptionExerciseName}
        onClose={() => setDescriptionExerciseName(null)}
      >
        <Text style={styles.descriptionModalTitle}>
          {descriptionExerciseName}
        </Text>
        <Text style={styles.descriptionModalBody}>
          {descriptionExerciseName
            ? descriptionByName[descriptionExerciseName]
            : null}
        </Text>
      </Modal>
    </View>
  );
};

export default WorkoutDetail;
