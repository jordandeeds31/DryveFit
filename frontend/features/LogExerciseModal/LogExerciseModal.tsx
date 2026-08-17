import Modal from "@/components/shared/Modal/Modal";
import styles from "./LogExerciseModal.styles";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { LogExerciseModalProps } from "./LogExercise.types";
import Button from "@/components/shared/Button/Button";
import {
  useLogExercisePerformance,
  useDeleteExercisePerformance,
} from "@/hooks/usePrograms";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  displayWeight,
  toStoredLbs,
  weightUnitLabel,
} from "@/lib/utils/units";

const LogExerciseModal = ({
  visible,
  onClose,
  exercise,
  sets,
  onSetsChange,
  onSaved,
}: LogExerciseModalProps) => {
  const unitSystem = useUnitSystem();
  const { mutate: logPerformance, isPending: isSaving } =
    useLogExercisePerformance();
  const { mutate: deletePerformance, isPending: isDeleting } =
    useDeleteExercisePerformance();

  const isPending = isSaving || isDeleting;
  const isBodyweight = exercise?.equipment === "bodyweight";

  const handleSave = () => {
    if (!exercise) return;

    const validSets = sets
      .filter(
        (set) =>
          (isBodyweight || set.weight.trim() !== "") &&
          set.reps.trim() !== "",
      )
      .map((set) => ({
        // Always stored in lbs — set.weight is whatever the user typed
        // in their OWN unit system, so it's converted back here
        // regardless of which one that was.
        weight: isBodyweight
          ? null
          : toStoredLbs(parseFloat(set.weight), unitSystem),
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
          onSaved?.(
            validSets.length === 1 ? "Set saved" : "Exercise saved",
          );
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
        {exercise?.recommendedWeight != null && (
          <Text style={styles.recommendedWeight}>
            Weight: {displayWeight(exercise.recommendedWeight, unitSystem)}{" "}
            {weightUnitLabel(unitSystem)}
          </Text>
        )}
        <Text style={styles.completionHint}>
          Log at least {exercise?.sets} sets of {exercise?.reps}+ reps
          {exercise?.recommendedWeight != null
            ? ` at ${displayWeight(exercise.recommendedWeight, unitSystem)}+ ${weightUnitLabel(unitSystem)}`
            : ""}{" "}
          to mark this exercise LOGGED — anything less will show as IN
          PROGRESS.
        </Text>
        {sets.map((set, index) => (
          <View key={set.id} style={styles.setRow}>
            <Text style={styles.setLabel}>Set {index + 1}</Text>
            {!isBodyweight && (
              <TextInput
                style={styles.input}
                placeholder={`Weight (${weightUnitLabel(unitSystem)})`}
                keyboardType="numeric"
                value={set.weight}
                onChangeText={(value) =>
                  handleUpdateSet(set.id, "weight", value)
                }
              />
            )}
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
        <Text style={styles.saveReminder}>
          Don't forget to tap Save — your sets aren't recorded until you do.
        </Text>
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
