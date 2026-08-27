import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import styles from "./WorkoutLogger.styles";
import { WorkoutLoggerProps, WorkoutLoggerHandle } from "./WorkoutLogger.types";
import { router } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import Modal from "@/components/shared/Modal/Modal";
import { Exercise } from "@/types/exercise.types";
import {
  useLogStandaloneWorkout,
  useDeleteWorkoutLogSet,
  useDeleteWorkoutLogsForDate,
} from "@/hooks/useWorkoutLogs";
import { usePreviousSession } from "@/hooks/useExercises";
import { formatCalendarDate } from "@/lib/utils/date.utils";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import {
  displayWeight,
  toStoredLbs,
  weightUnitLabel,
} from "@/lib/utils/units";
import { UnitSystem } from "@/types/user.types";
import { colors } from "@/constants/colors";

const formatSessionDate = (dateStr: string) =>
  formatCalendarDate(dateStr, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

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

const CheckPreviousWorkoutButton = ({
  exerciseName,
  beforeDate,
  onPress,
}: {
  exerciseName: string;
  beforeDate: string | undefined;
  onPress: () => void;
}) => {
  const { data: previousSession } = usePreviousSession(
    exerciseName,
    beforeDate,
    true,
  );

  if (!previousSession) return null;

  return (
    <TouchableOpacity style={styles.checkPreviousButton} onPress={onPress}>
      <Text style={styles.checkPreviousText}>PREVIOUS WORKOUT</Text>
    </TouchableOpacity>
  );
};

const createBlankEntry = (): ExerciseEntry => ({
  id: `${Date.now()}-${Math.random()}`,
  exercise: null,
  sets: [],
});

const mapWorkoutLogsToEntries = (
  workoutLogs: WorkoutLoggerProps["initialWorkoutLogs"],
  unitSystem: UnitSystem,
): ExerciseEntry[] => {
  return workoutLogs.flatMap((workout) =>
    workout.exercises.map((exercise) => ({
      id: exercise.id,
      exercise: {
        name: exercise.exerciseName,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
      } as Exercise,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        // Stored/loaded in lbs always — converted to the field's display
        // unit here so a metric user edits/sees kg, not raw lbs.
        weight:
          set.weight != null
            ? displayWeight(set.weight, unitSystem).toString()
            : "",
        reps: set.reps?.toString() ?? "",
      })),
    })),
  );
};

// Same exercise-selection, but one blank set each instead of copying past
// performance numbers — this is what actually got weight/reps in the
// inherited-from-someone's-profile workout is up to the viewer, not the
// person it came from.
const mapPrefillToEntries = (
  prefillExercises: WorkoutLoggerProps["prefillExercises"],
): ExerciseEntry[] =>
  (prefillExercises ?? []).map((exercise, index) => ({
    id: `prefill-${index}-${Date.now()}`,
    exercise: {
      name: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
    } as Exercise,
    sets: [{ id: `prefill-set-${index}-${Date.now()}`, weight: "", reps: "" }],
  }));

const buildInitialEntries = (
  initialWorkoutLogs: WorkoutLoggerProps["initialWorkoutLogs"],
  prefillExercises: WorkoutLoggerProps["prefillExercises"],
  unitSystem: UnitSystem,
): ExerciseEntry[] => {
  const mappedEntries = mapWorkoutLogsToEntries(initialWorkoutLogs, unitSystem);
  if (mappedEntries.length > 0) return mappedEntries;

  const prefillEntries = mapPrefillToEntries(prefillExercises);
  return prefillEntries.length > 0 ? prefillEntries : [createBlankEntry()];
};

const WorkoutLogger = forwardRef<WorkoutLoggerHandle, WorkoutLoggerProps>(
  (
    {
      setClose,
      date,
      initialWorkoutLogs,
      onSaved,
      prefillExercises,
      onDirtyChange,
      onSavingChange,
    },
    ref,
  ) => {
    const unitSystem = useUnitSystem();
    const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>(
      () => buildInitialEntries(initialWorkoutLogs, prefillExercises, unitSystem),
    );
    // Reported to the parent, which renders the actual Save button pinned
    // above the scrollable content (see index.tsx) — a button rendered here,
    // inline in this component's own content, would scroll out of view once
    // enough exercises are added, same problem the very first bottom-of-
    // screen version had.
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    const { mutate: logWorkout, isPending } = useLogStandaloneWorkout();

    useEffect(() => {
      onSavingChange?.(isPending);
    }, [isPending, onSavingChange]);

    const { mutate: deleteWorkoutLogSet } = useDeleteWorkoutLogSet();
    const { mutate: deleteWholeWorkout, isPending: isDeletingWorkout } =
      useDeleteWorkoutLogsForDate();

    const [previousModalEntryId, setPreviousModalEntryId] = useState<
      string | null
    >(null);
    const previousModalEntry = exerciseEntries.find(
      (entry) => entry.id === previousModalEntryId,
    );
    const { data: previousSession, isLoading: isPreviousLoading } =
      usePreviousSession(
        previousModalEntry?.exercise?.name ?? null,
        date,
        !!previousModalEntryId,
      );

    // Set IDs already persisted to the database (loaded from initialWorkoutLogs) —
    // deleting one of these needs an immediate API call, not just local state removal.
    const persistedSetIds = new Set(
      initialWorkoutLogs.flatMap((workout) =>
        workout.exercises.flatMap((exercise) =>
          exercise.sets.map((set) => set.id),
        ),
      ),
    );

    useEffect(() => {
      setExerciseEntries(
        buildInitialEntries(initialWorkoutLogs, prefillExercises, unitSystem),
      );
      setIsDirty(false);
      // prefillExercises/unitSystem deliberately excluded — prefillExercises
      // should only seed the form once, on whichever mount/date it was
      // passed in for (the parent clears it from its own state right
      // after, so including it here would just re-apply it on every
      // unrelated initialWorkoutLogs change until that clear lands);
      // unitSystem changing mid-edit shouldn't silently rewrite whatever
      // the user's already typed.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialWorkoutLogs]);

    const handleAddExercise = () => {
      setExerciseEntries((prev) => [...prev, createBlankEntry()]);
    };

    const handleRemoveExercise = (entryId: string) => {
      setExerciseEntries((prev) =>
        prev.filter((entry) => entry.id !== entryId),
      );
      setIsDirty(true);
    };

    const handleSelectExercise = (
      entryId: string,
      exercise: Exercise | null,
    ) => {
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
      setIsDirty(true);

      if (persistedSetIds.has(setId)) {
        deleteWorkoutLogSet({ exerciseLogId: entryId, setId });
      }
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
      setIsDirty(true);
    };

    const handleSave = () => {
      // Tapping Save while a weight/reps field is still focused should close
      // the keyboard immediately rather than leaving it up until the field
      // loses focus on its own.
      Keyboard.dismiss();

      const payload = exerciseEntries
        .filter((entry) => entry.exercise !== null)
        .map((entry) => {
          const isBodyweight = entry.exercise?.equipment === "bodyweight";
          const validSets = entry.sets
            .filter(
              (set) =>
                (isBodyweight || set.weight.trim() !== "") &&
                set.reps.trim() !== "",
            )
            .map((set) => ({
              // Always stored in lbs — set.weight is whatever the user
              // typed in their OWN unit system, so it's converted back
              // here regardless of which one that was.
              weight: isBodyweight
                ? null
                : toStoredLbs(parseFloat(set.weight), unitSystem),
              reps: parseInt(set.reps, 10),
            }));

          return {
            exerciseName: entry.exercise!.name,
            muscleGroup: entry.exercise!.muscleGroup,
            sets: validSets,
          };
        })
        .filter((entry) => entry.sets.length > 0);

      if (payload.length === 0) {
        // The backend rejects an empty exercises array (it has no concept
        // of "save with nothing in it"), so removing every exercise and
        // tapping Save used to just silently no-op — the day's previously
        // saved exercises were still sitting in the database untouched,
        // even though the form now showed nothing (the same class of bug
        // as the stale-schedule-dot issue: the UI looked cleared, the data
        // wasn't). If there's something to actually clear, delete it;
        // otherwise there's genuinely nothing to do.
        if (initialWorkoutLogs.length > 0) {
          deleteWholeWorkout(date, {
            onSuccess: () => {
              setIsDirty(false);
              onSaved?.("Workout deleted");
            },
          });
        }
        return;
      }

      logWorkout(
        { exercises: payload, date },
        {
          onSuccess: () => {
            setIsDirty(false);
            onSaved?.("Workout saved");
          },
        },
      );
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    const handleDeleteWorkout = () => {
      Alert.alert(
        "Delete this workout?",
        "This will permanently delete everything logged for this day.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteWholeWorkout(date, {
                onSuccess: () => setClose(false),
              });
            },
          },
        ],
      );
    };

    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Workout Log</Text>
          {initialWorkoutLogs.length > 0 && (
            <TouchableOpacity
              onPress={handleDeleteWorkout}
              disabled={isDeletingWorkout}
            >
              <Feather name="trash-2" size={18} color={colors.dangerRed} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.voiceTipBanner}
          onPress={() => {
            // This screen normally lives inside index.tsx's Modal —
            // closing it first, same as the delete-workout flow does,
            // so it isn't left floating on top of the chat screen.
            setClose(false);
            router.push("/ai-chat");
          }}
        >
          <Feather name="mic" size={16} color={colors.primaryBlue} />
          <Text style={styles.voiceTipBannerText}>
            Tip: tell your AI coach what you did instead of typing it — tap
            to open the chat and use the mic.
          </Text>
        </TouchableOpacity>

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
                <TouchableOpacity
                  onPress={() => handleRemoveExercise(entry.id)}
                >
                  <AntDesign name="closecircleo" size={20} color="gray" />
                </TouchableOpacity>
              )}
            </View>

            {entry.exercise && (
              <View style={styles.setsContainer}>
                <CheckPreviousWorkoutButton
                  exerciseName={entry.exercise.name}
                  beforeDate={date}
                  onPress={() => setPreviousModalEntryId(entry.id)}
                />
                {entry.sets.map((set, setIndex) => (
                  <View key={set.id} style={styles.setRow}>
                    <Text style={styles.setLabel}>Set {setIndex + 1}</Text>

                    {entry.exercise?.equipment !== "bodyweight" && (
                      <TextInput
                        style={styles.input}
                        placeholder={`Weight (${weightUnitLabel(unitSystem)})`}
                        keyboardType="numeric"
                        value={set.weight}
                        onChangeText={(value) =>
                          handleUpdateSet(entry.id, set.id, "weight", value)
                        }
                      />
                    )}

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
        </View>
        {isDirty && (
          <Text style={styles.saveReminder}>
            Don't forget to tap Save — your sets aren't recorded until you do.
          </Text>
        )}

        <Modal
          visible={!!previousModalEntryId}
          onClose={() => setPreviousModalEntryId(null)}
        >
          <Text style={styles.title}>{previousModalEntry?.exercise?.name}</Text>
          {isPreviousLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : !previousSession ? (
            <Text style={styles.saveReminder}>
              No previous session logged for this exercise yet.
            </Text>
          ) : (
            <>
              <Text style={styles.previousSessionDate}>
                {formatSessionDate(previousSession.date)}
              </Text>
              {previousSession.sets.map((set) => (
                <View key={set.setNumber} style={styles.setRow}>
                  <Text style={styles.setLabel}>Set {set.setNumber}</Text>
                  <Text style={styles.previousSetValue}>
                    {set.weight != null
                      ? `${displayWeight(set.weight, unitSystem)} ${weightUnitLabel(unitSystem)} x `
                      : ""}
                    {set.reps ?? "-"} reps
                  </Text>
                </View>
              ))}
            </>
          )}
        </Modal>
      </View>
    );
  },
);

export default WorkoutLogger;
