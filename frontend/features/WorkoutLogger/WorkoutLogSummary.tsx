import { View, Text, TouchableOpacity, Share } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { WorkoutLog } from "@/types/workoutLog.types";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { displayWeight, weightUnitLabel } from "@/lib/utils/units";
import { colors } from "@/constants/colors";
import styles from "./WorkoutLogSummary.styles";

interface WorkoutLogSummaryProps {
  workoutLogs: WorkoutLog[];
}

// Read-only view of a day's already-logged standalone workout — logging
// itself now happens in a modal (see index.tsx). The way back into that
// modal to make changes is index.tsx's fixed "EDIT WORKOUT" bottom bar,
// not a button here, so this is purely the read-only summary.
const WorkoutLogSummary = ({ workoutLogs }: WorkoutLogSummaryProps) => {
  const unitSystem = useUnitSystem();
  const exercises = workoutLogs.flatMap((log) => log.exercises);

  const handleShare = async () => {
    const dateLabel = workoutLogs[0]
      ? new Date(workoutLogs[0].loggedAt).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })
      : "";

    const lines = [`My workout — ${dateLabel}`, ""];
    for (const exercise of exercises) {
      lines.push(exercise.exerciseName);
      for (const set of exercise.sets) {
        const weightPart =
          set.weight != null
            ? `${displayWeight(set.weight, unitSystem)} ${weightUnitLabel(unitSystem)} x `
            : "";
        lines.push(`  Set ${set.setNumber}: ${weightPart}${set.reps ?? "-"} reps`);
      }
    }

    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // User backed out of the share sheet — nothing to react to.
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="share" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {exercises.map((exercise, index) => (
        <View
          key={exercise.id}
          style={[styles.exerciseBlock, index > 0 && styles.exerciseBlockSpaced]}
        >
          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
          {exercise.sets.map((set) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {set.setNumber}</Text>
              <Text style={styles.setValue}>
                {set.weight != null
                  ? `${displayWeight(set.weight, unitSystem)} ${weightUnitLabel(unitSystem)} x `
                  : ""}
                {set.reps ?? "-"} reps
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default WorkoutLogSummary;
