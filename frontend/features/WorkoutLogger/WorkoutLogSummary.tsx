import { View, Text } from "react-native";
import { WorkoutLog } from "@/types/workoutLog.types";
import Button from "@/components/shared/Button/Button";
import styles from "./WorkoutLogSummary.styles";

interface WorkoutLogSummaryProps {
  workoutLogs: WorkoutLog[];
  onEdit: () => void;
}

// Read-only view of a day's already-logged standalone workout — logging
// itself now happens in a modal (see index.tsx), so this is what Home
// shows in its place once a day has something logged: a summary plus a
// button back into that same modal, pre-filled, to make changes.
const WorkoutLogSummary = ({ workoutLogs, onEdit }: WorkoutLogSummaryProps) => {
  const exercises = workoutLogs.flatMap((log) => log.exercises);

  return (
    <View style={styles.container}>
      {exercises.map((exercise) => (
        <View key={exercise.id} style={styles.exerciseBlock}>
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.sets.map((set) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {set.setNumber}</Text>
              <Text style={styles.setValue}>
                {set.weight != null ? `${set.weight} lbs x ` : ""}
                {set.reps ?? "-"} reps
              </Text>
            </View>
          ))}
        </View>
      ))}
      <Button
        title="EDIT WORKOUT"
        onPress={onEdit}
        variant="outline"
        style={styles.editButton}
      />
    </View>
  );
};

export default WorkoutLogSummary;
