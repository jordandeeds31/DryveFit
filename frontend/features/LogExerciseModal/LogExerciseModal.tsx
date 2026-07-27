import Modal from "@/components/shared/Modal/Modal";
import styles from "./LogExerciseModal.styles";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { LogExerciseModalProps } from "./LogExercise.types";
import Button from "@/components/shared/Button/Button";
import {
  useLogExercisePerformance,
  useDeleteExercisePerformance,
} from "@/hooks/usePrograms";

const LogExerciseModal = ({
  visible,
  onClose,
  exercise,
  sets,
  onSetsChange,
}: LogExerciseModalProps) => {
  const { mutate: logPerformance, isPending: isSaving } =
    useLogExercisePerformance();
  const { mutate: deletePerformance, isPending: isDeleting } =
    useDeleteExercisePerformance();

  const isPending = isSaving || isDeleting;

  const handleSave = () => {
    if (!exercise) return;

    const validSets = sets
      .filter((set) => set.weight.trim() !== "" && set.reps.trim() !== "")
      .map((set) => ({
        weight: parseFloat(set.weight),
        reps: parseInt(set.reps, 10),
      }));

    if (validSets.length === 0) {
      // No sets left — treat this as "clear the logged performance for this exercise"
      deletePerformance(exercise.id, {
        onError: (error) => {
          console.log("Delete failed:", JSON.stringify(error, null, 2));
          onClose();
        },
        onSuccess: () => {
          console.log("Delete succeeded");
          onClose();
        },
      });
      return;
    }

    logPerformance(
      { programExerciseId: exercise.id, sets: validSets },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const handleAddSet = () => {
    onSetsChange([
      ...sets,
      { id: `${Date.now()}-${sets.length}`, weight: "", reps: "" },
    ]);
  };

  const handleDeleteSet = (id: string) => {
    onSetsChange(sets.filter((set) => set.id !== id));
  };

  const handleUpdateSet = (
    id: string,
    field: "weight" | "reps",
    value: string,
  ) => {
    onSetsChange(
      sets.map((set) => (set.id === id ? { ...set, [field]: value } : set)),
    );
  };

  return (
    <View style={styles.container}>
      <Modal visible={visible} onClose={onClose}>
        <Text style={styles.title}>
          {exercise?.exerciseName} ({exercise?.sets} sets x {exercise?.reps}{" "}
          reps)
        </Text>
        {sets.map((set, index) => (
          <View key={set.id} style={styles.setRow}>
            <Text style={styles.setLabel}>Set {index + 1}</Text>
            <TextInput
              style={styles.input}
              placeholder="Weight"
              keyboardType="numeric"
              value={set.weight}
              onChangeText={(value) => handleUpdateSet(set.id, "weight", value)}
            />
            <TextInput
              style={styles.input}
              placeholder="Reps"
              keyboardType="numeric"
              value={set.reps}
              onChangeText={(value) => handleUpdateSet(set.id, "reps", value)}
            />
            <TouchableOpacity onPress={() => handleDeleteSet(set.id)}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.addSetButton, styles.addSetButtonInRow]}
            onPress={handleAddSet}
          >
            <Text style={styles.addSetText}>+ ADD SET</Text>
          </TouchableOpacity>
          <Button
            title={isPending ? "SAVING..." : "SAVE"}
            style={{ height: 40, flex: 1 }}
            onPress={handleSave}
            disabled={isPending}
          />
        </View>
      </Modal>
    </View>
  );
};

export default LogExerciseModal;
