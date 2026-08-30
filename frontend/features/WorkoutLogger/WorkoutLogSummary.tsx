import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Share, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import { WorkoutLog } from "@/types/workoutLog.types";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { useExercises } from "@/hooks/useExercises";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";
import { displayWeight, weightUnitLabel } from "@/lib/utils/units";
import { colors } from "@/constants/colors";
import styles from "./WorkoutLogSummary.styles";

interface WorkoutLogSummaryProps {
  workoutLogs: WorkoutLog[];
}

// A standalone-logged exercise only stores its own name (see
// ExerciseLog), not an image — the catalog (same one DropdownExerciseSelect
// searches) is where the GIF-proxy imageUrl actually lives, keyed by the
// same exercise name.
const ExerciseThumbnail = ({
  uri,
  headers,
}: {
  uri: string;
  headers: Record<string, string>;
}) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={styles.exerciseImageWrapper}>
      <Image
        source={{ uri, headers }}
        style={styles.exerciseImage}
        contentFit="cover"
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
      />
      {isLoading && (
        <ActivityIndicator
          style={styles.exerciseImageLoading}
          size="small"
          color={colors.primaryBlue}
        />
      )}
    </View>
  );
};

// Read-only view of a day's already-logged standalone workout — logging
// itself now happens in a modal (see index.tsx). The way back into that
// modal to make changes is index.tsx's fixed "EDIT WORKOUT" bottom bar,
// not a button here, so this is purely the read-only summary.
const WorkoutLogSummary = ({ workoutLogs }: WorkoutLogSummaryProps) => {
  const unitSystem = useUnitSystem();
  const exercises = workoutLogs.flatMap((log) => log.exercises);
  const { data: exerciseCatalog } = useExercises();
  const authImageHeaders = useAuthImageHeaders();

  const imageUrlByName = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const catalogExercise of exerciseCatalog ?? []) {
      map[catalogExercise.name] = catalogExercise.imageUrl;
    }
    return map;
  }, [exerciseCatalog]);

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
      {exercises.map((exercise, index) => {
        const imageUrl = imageUrlByName[exercise.exerciseName];
        return (
          <View
            key={exercise.id}
            style={[styles.exerciseBlock, index > 0 && styles.exerciseBlockSpaced]}
          >
            <View style={styles.exerciseBlockRow}>
              <View style={styles.exerciseTextGroup}>
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
              {imageUrl && authImageHeaders ? (
                <ExerciseThumbnail
                  uri={`${process.env.EXPO_PUBLIC_API_URL}${imageUrl}`}
                  headers={authImageHeaders}
                />
              ) : (
                <View style={styles.exerciseImagePlaceholder}>
                  <Feather name="image" size={24} color={colors.textSecondary} />
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default WorkoutLogSummary;
