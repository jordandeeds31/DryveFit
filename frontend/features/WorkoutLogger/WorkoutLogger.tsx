import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import styles from "./WorkoutLogger.styles";
import { WorkoutLoggerProps } from "./WorkoutLogger.types";
import AntDesign from "@expo/vector-icons/AntDesign";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import Button from "@/components/shared/Button/Button";
import { Exercise } from "@/types/exercise.types";
import { useLogStandaloneWorkout } from "@/hooks/useWorkoutLogs";

interface SetEntry {
  id: string;
  weight: string;
  reps: string;
}

interface ExerciseEntry {
  id: string;
  exercise: Exercise | null;
  sets: SetEntry[];
}

const createBlankEntry = (): ExerciseEntry => ({
  id: `${Date.now()}-${Math.random()}`,
  exercise: null,
  sets: [],
});

const mapWorkoutLogsToEntries = (
  workoutLogs: WorkoutLoggerProps["initialWorkoutLogs"],
): ExerciseEntry[] => {
  return workoutLogs.flatMap((workout) =>
    workout.exercises.map((exercise) => ({
      id: exercise.id,
      exercise: {
        name: exercise.exerciseName,
        muscleGroup: exercise.muscleGroup,
      } as Exercise,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        weight: set.weight?.toString() ?? "",
        reps: set.reps?.toString() ?? "",
      })),
    })),
  );
};

const WorkoutLogger = ({
  setClose,
  date,
  initialWorkoutLogs,
}: WorkoutLoggerProps) => {
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>(
    () => {
      const mappedEntries = mapWorkoutLogsToEntries(initialWorkoutLogs);

      return mappedEntries.length > 0 ? mappedEntries : [createBlankEntry()];
    },
  );

  const { mutate: logWorkout, isPending } = useLogStandaloneWorkout();

  useEffect(() => {
    const mappedEntries = mapWorkoutLogsToEntries(initialWorkoutLogs);

    setExerciseEntries(
      mappedEntries.length > 0 ? mappedEntries : [createBlankEntry()],
    );
  }, [initialWorkoutLogs]);

  const handleAddExercise = () => {
    setExerciseEntries((prev) => [...prev, createBlankEntry()]);
  };

  const handleRemoveExercise = (entryId: string) => {
    setExerciseEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const handleSelectExercise = (entryId: string, exercise: Exercise | null) => {
    setExerciseEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId ? { ...entry, exercise } : entry,
      ),
    );
  };

  const handleAddSet = (entryId: string) => {
    setExerciseEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              sets: [
                ...entry.sets,
                {
                  id: `${Date.now()}-${entry.sets.length}`,
                  weight: "",
                  reps: "",
                },
              ],
            }
          : entry,
      ),
    );
  };

  const handleDeleteSet = (entryId: string, setId: string) => {
    setExerciseEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              sets: entry.sets.filter((set) => set.id !== setId),
            }
          : entry,
      ),
    );
  };

  const handleUpdateSet = (
    entryId: string,
    setId: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    setExerciseEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              sets: entry.sets.map((set) =>
                set.id === setId
                  ? {
                      ...set,
                      [field]: value,
                    }
                  : set,
              ),
            }
          : entry,
      ),
    );
  };

  const handleSave = () => {
    const payload = exerciseEntries
      .filter((entry) => entry.exercise !== null)
      .map((entry) => {
        const validSets = entry.sets
          .filter((set) => set.weight.trim() !== "" && set.reps.trim() !== "")
          .map((set) => ({
            weight: parseFloat(set.weight),
            reps: parseInt(set.reps, 10),
          }));

        return {
          exerciseName: entry.exercise!.name,
          muscleGroup: entry.exercise!.muscleGroup,
          sets: validSets,
        };
      })
      .filter((entry) => entry.sets.length > 0);

    if (payload.length === 0) return;

    logWorkout(
      {
        exercises: payload,
        date,
      },
      {
        onSuccess: () => {
          setClose(false);
        },
      },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text>Workout Log</Text>
        <TouchableOpacity onPress={() => setClose(false)}>
          <AntDesign name="close" size={20} color="black" />
        </TouchableOpacity>
      </View>

      {exerciseEntries.map((entry) => (
        <View key={entry.id} style={styles.exerciseBlock}>
          <View style={styles.exerciseBlockHeader}>
            <View style={styles.dropdownWrapper}>
              <DropdownExerciseSelect
                selectedExercise={entry.exercise}
                setSelectedExercise={(exercise) =>
                  handleSelectExercise(entry.id, exercise)
                }
              />
            </View>

            {exerciseEntries.length > 1 && (
              <TouchableOpacity onPress={() => handleRemoveExercise(entry.id)}>
                <AntDesign name="closecircleo" size={20} color="gray" />
              </TouchableOpacity>
            )}
          </View>

          {entry.exercise && (
            <View style={styles.setsContainer}>
              {entry.sets.map((set, setIndex) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={styles.setLabel}>Set {setIndex + 1}</Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Weight"
                    keyboardType="numeric"
                    value={set.weight}
                    onChangeText={(value) =>
                      handleUpdateSet(entry.id, set.id, "weight", value)
                    }
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Reps"
                    keyboardType="numeric"
                    value={set.reps}
                    onChangeText={(value) =>
                      handleUpdateSet(entry.id, set.id, "reps", value)
                    }
                  />

                  <TouchableOpacity
                    onPress={() => handleDeleteSet(entry.id, set.id)}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addSetButton}
                onPress={() => handleAddSet(entry.id)}
              >
                <Text style={styles.addSetText}>+ ADD SET</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      <View style={styles.addExerciseSaveRow}>
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={handleAddExercise}
        >
          <Text style={styles.addExerciseText}>+ ADD EXERCISE</Text>
        </TouchableOpacity>

        <Button
          title={isPending ? "SAVING..." : "SAVE"}
          style={{
            height: 40,
            marginTop: 16,
            flex: 1,
          }}
          onPress={handleSave}
          disabled={isPending}
        />
      </View>
    </View>
  );
};

export default WorkoutLogger;
