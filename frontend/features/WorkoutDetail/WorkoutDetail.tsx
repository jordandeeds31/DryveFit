import { useEffect, useState } from "react";
import styles from "./WorkoutDetail.styles";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { WorkoutDetailProps } from "./WorkoutDetail.types";
import type { RootState } from "@/store";
import Button from "@/components/shared/Button/Button";
import Modal from "@/components/shared/Modal/Modal";
import DropdownExerciseSelect from "@/components/shared/DropdownExerciseSelect/DropdownExerciseSelect";
import LogExerciseModal from "../LogExerciseModal/LogExerciseModal";
import { SetEntry } from "../LogExerciseModal/LogExercise.types";
import { ProgramExercise } from "@/types/programs.types";
import { Exercise } from "@/types/exercise.types";
import { useExercises, usePreviousSession } from "@/hooks/useExercises";
import {
  useSwapProgramExercise,
  useAddProgramExercise,
  useRevertDaySwaps,
  useDeleteProgramExercise,
  usePostponeProgramDay,
} from "@/hooks/usePrograms";
import { colors } from "@/constants/colors";
import { formatCalendarDate, startOfDay } from "@/lib/utils/date.utils";
import { useAuthImageHeaders } from "@/hooks/useAuthImageHeaders";

const formatSessionDate = (dateStr: string) =>
  formatCalendarDate(dateStr, {
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

const WorkoutDetail = ({
  dayDetail,
  isLoading,
  programId,
  onExerciseSaved,
}: WorkoutDetailProps) => {
  const authImageHeaders = useAuthImageHeaders();
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
  const [firstTimeNoticeExerciseId, setFirstTimeNoticeExerciseId] = useState<
    string | null
  >(null);
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [enlargedImageFailed, setEnlargedImageFailed] = useState(false);
  // Bumped on retry and appended to the request URL — the proxy ignores
  // unknown query params, so this only serves to give the client (and
  // expo-image's own cache) a fresh URL to force a real retry instead of
  // replaying the same failed request.
  const [enlargedImageRetryToken, setEnlargedImageRetryToken] = useState(0);
  const [swapTargetExercise, setSwapTargetExercise] = useState<Exercise | null>(
    null,
  );
  const [isAddExerciseModalVisible, setIsAddExerciseModalVisible] =
    useState(false);
  const [newExercise, setNewExercise] = useState<Exercise | null>(null);
  const [newExerciseSets, setNewExerciseSets] = useState("3");
  const [newExerciseReps, setNewExerciseReps] = useState("10");
  const [newExerciseRestSeconds, setNewExerciseRestSeconds] = useState("60");

  const { mutate: swapExercise, isPending: isSwappingExercise } =
    useSwapProgramExercise();
  const { mutate: addExercise, isPending: isAddingExercise } =
    useAddProgramExercise();
  const { mutate: revertSwaps, isPending: isReverting } = useRevertDaySwaps();
  const { mutate: deleteExercise } = useDeleteProgramExercise();
  const { mutate: postponeDay, isPending: isPostponing } =
    usePostponeProgramDay();

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

  const handleDeleteExercise = (exercise: ProgramExercise) => {
    Alert.alert(
      "Delete this exercise?",
      `"${exercise.exerciseName}" will be removed from this workout.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteExercise(exercise.id, {
              onError: (error) => {
                console.log("Delete exercise failed:", JSON.stringify(error, null, 2));
                Alert.alert("Couldn't delete exercise", "Please try again.");
              },
            });
          },
        },
      ],
    );
  };

  const handleCloseSwapModal = () => {
    setSwapExerciseId(null);
    setSwapTargetExercise(null);
  };

  const handleConfirmSwapExercise = () => {
    if (!swapTargetExercise || !swapExerciseId) return;

    swapExercise(
      { programExerciseId: swapExerciseId, newExerciseId: swapTargetExercise.id },
      {
        onSuccess: handleCloseSwapModal,
        onError: (error) => {
          console.log("Swap exercise failed:", JSON.stringify(error, null, 2));
          Alert.alert("Couldn't swap exercise", "Please try again.");
        },
      },
    );
  };

  const handleCloseAddExerciseModal = () => {
    setIsAddExerciseModalVisible(false);
    setNewExercise(null);
    setNewExerciseSets("3");
    setNewExerciseReps("10");
    setNewExerciseRestSeconds("60");
  };

  const handleSubmitAddExercise = () => {
    if (!newExercise || !dayDetail) return;

    const sets = parseInt(newExerciseSets, 10);
    const reps = parseInt(newExerciseReps, 10);
    const restSeconds = parseInt(newExerciseRestSeconds, 10);
    if (isNaN(sets) || isNaN(reps) || isNaN(restSeconds)) return;

    addExercise(
      {
        dayId: dayDetail.id,
        payload: { exerciseId: newExercise.id, sets, reps, restSeconds },
      },
      {
        onSuccess: handleCloseAddExerciseModal,
        onError: (error) => {
          console.log("Add exercise failed:", JSON.stringify(error, null, 2));
          Alert.alert("Couldn't add exercise", "Please try again.");
        },
      },
    );
  };

  const selectedExercise = dayDetail?.exercises.find(
    (exercise) => exercise.id === selectedExerciseId,
  );

  const previousExercise = dayDetail?.exercises.find(
    (exercise) => exercise.id === previousExerciseId,
  );

  const firstTimeNoticeExercise = dayDetail?.exercises.find(
    (exercise) => exercise.id === firstTimeNoticeExerciseId,
  );

  const { data: previousSession, isLoading: isPreviousLoading } =
    usePreviousSession(
      previousExercise?.exerciseName ?? null,
      dayDetail?.date,
      !!previousExerciseId,
    );

  const hasSwappedExercise = !!dayDetail?.exercises.some(
    (exercise) => exercise.originalExerciseName != null,
  );

  const handleRevertSwaps = () => {
    if (!dayDetail) return;
    Alert.alert(
      "Revert all swaps?",
      "Every exercise you've swapped today will go back to what was originally prescribed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revert",
          style: "destructive",
          onPress: () => {
            revertSwaps(dayDetail.id, {
              onError: (error) => {
                console.log("Revert swaps failed:", JSON.stringify(error, null, 2));
                Alert.alert("Couldn't revert swaps", "Please try again.");
              },
            });
          },
        },
      ],
    );
  };

  const canStartCinematicMode =
    !!dayDetail &&
    !!programId &&
    !dayDetail.isRestDay &&
    dayDetail.exercises.length > 0;

  // A day only qualifies to be pushed forward if it's a real training day
  // that's already in the past with nothing logged against it yet — once
  // any set is logged, postponing would just orphan that progress.
  const isMissedDay =
    !!dayDetail &&
    !dayDetail.isRestDay &&
    dayDetail.exercises.every((exercise) => exercise.exerciseLogs.length === 0) &&
    startOfDay(new Date(dayDetail.date)) < startOfDay(new Date());

  const handlePostponeDay = () => {
    if (!dayDetail) return;
    Alert.alert(
      "Move this workout to tomorrow?",
      "Every day after it in this program shifts forward one day too, so the rest of your schedule stays in order.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move it",
          onPress: () => {
            postponeDay(dayDetail.id, {
              onError: (error) => {
                console.log("Postpone day failed:", JSON.stringify(error, null, 2));
                Alert.alert("Couldn't move this workout", "Please try again.");
              },
            });
          },
        },
      ],
    );
  };

  const cinematicSessionKey =
    dayDetail && programId
      ? `${programId}:${dayDetail.date.slice(0, 10)}`
      : null;
  const isResumingCinematicMode = useSelector((state: RootState) =>
    cinematicSessionKey
      ? cinematicSessionKey in state.cinematicTimer.currentIndexBySession
      : false,
  );

  const handleStartCinematicMode = () => {
    if (!dayDetail || !programId) return;
    router.push({
      pathname: "/cinematic-mode",
      // dayDetail.date is a full ISO datetime string — the backend's
      // getProgramDay expects a bare "YYYY-MM-DD". Slicing the UTC-anchored
      // string directly (not re-parsing through a local Date, which can
      // roll the day back for users west of UTC) matches the safe pattern
      // already used elsewhere in this codebase for the same reason.
      params: { programId, date: dayDetail.date.slice(0, 10) },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.focusRow}>
        <Text style={styles.focus}>{dayDetail?.focus}</Text>
        <View style={styles.focusActionsRow}>
          {!!dayDetail && (
            <TouchableOpacity
              style={styles.revertButton}
              onPress={handlePostponeDay}
              disabled={isPostponing}
            >
              <Feather
                name="calendar"
                size={12}
                color={colors.textSecondary}
              />
              <Text style={styles.revertButtonText}>
                {isPostponing ? "MOVING..." : "MOVE TO TOMORROW"}
              </Text>
            </TouchableOpacity>
          )}
          {hasSwappedExercise && (
            <TouchableOpacity
              style={styles.revertButton}
              onPress={handleRevertSwaps}
              disabled={isReverting}
            >
              <Feather name="rotate-ccw" size={12} color={colors.textSecondary} />
              <Text style={styles.revertButtonText}>
                {isReverting ? "REVERTING..." : "REVERT ALL SWAPS"}
              </Text>
            </TouchableOpacity>
          )}
          {canStartCinematicMode && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartCinematicMode}
            >
              <Feather name="play" size={12} color="white" />
              <Text style={styles.startButtonText}>
                {isResumingCinematicMode ? "RESUME" : "START"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {dayDetail?.exercises.map((exercise) => {
        const logButtonState = getLogButtonState(exercise);

        return (
          <View key={exercise.id} style={styles.exerciseRow}>
            <View style={styles.exerciseContent}>
              <View style={styles.exerciseNameRow}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <View style={styles.exerciseIconsRow}>
                  {descriptionByName[exercise.exerciseName] && (
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                  {exercise.equipment !== "bodyweight" &&
                    exercise.recommendedWeight == null && (
                      <TouchableOpacity
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={() =>
                          setFirstTimeNoticeExerciseId(exercise.id)
                        }
                      >
                        <Feather
                          name="alert-circle"
                          size={16}
                          color={colors.primaryBlue}
                        />
                      </TouchableOpacity>
                    )}
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setSwapExerciseId(exercise.id)}
                  >
                    <Feather
                      name="repeat"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => handleDeleteExercise(exercise)}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={colors.dangerRed}
                    />
                  </TouchableOpacity>
                </View>
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
                <CheckPreviousWorkoutButton
                  exerciseName={exercise.exerciseName}
                  beforeDate={dayDetail?.date}
                  onPress={() => setPreviousExerciseId(exercise.id)}
                />
              </View>
            </View>
            {exercise.imageUrl && authImageHeaders ? (
              <TouchableOpacity
                onPress={() => {
                  setEnlargedImageFailed(false);
                  setEnlargedImageRetryToken(0);
                  setEnlargedImage({
                    url: exercise.imageUrl!,
                    name: exercise.exerciseName,
                  });
                }}
              >
                <Image
                  source={{
                    uri: `${process.env.EXPO_PUBLIC_API_URL}${exercise.imageUrl}`,
                    headers: authImageHeaders,
                  }}
                  style={styles.exerciseImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.exerciseImagePlaceholder}>
                <Feather
                  name="image"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </View>
        );
      })}
      {dayDetail && (
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setIsAddExerciseModalVisible(true)}
        >
          <Text style={styles.addExerciseText}>+ ADD EXERCISE</Text>
        </TouchableOpacity>
      )}
      {selectedExercise && (
        <LogExerciseModal
          visible={logModalVisible}
          onClose={handleCloseModal}
          exercise={selectedExercise}
          sets={setsByExercise[selectedExercise.id] ?? []}
          onSetsChange={(sets) => handleSetsChange(selectedExercise.id, sets)}
          onSaved={onExerciseSaved}
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
        visible={!!firstTimeNoticeExerciseId}
        onClose={() => setFirstTimeNoticeExerciseId(null)}
      >
        <Text style={styles.descriptionModalTitle}>
          {firstTimeNoticeExercise?.exerciseName}
        </Text>
        <Text style={styles.descriptionModalBody}>
          First time doing this — pick a weight you can complete for every
          set, and we'll set your recommended weight next time.
        </Text>
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
      <Modal visible={!!swapExerciseId} onClose={handleCloseSwapModal}>
        <Text style={styles.descriptionModalTitle}>Swap Exercise</Text>
        <DropdownExerciseSelect
          selectedExercise={swapTargetExercise}
          setSelectedExercise={setSwapTargetExercise}
        />
        <TouchableOpacity
          style={[
            styles.addExerciseSubmitButton,
            (!swapTargetExercise || isSwappingExercise) &&
              styles.addExerciseSubmitButtonDisabled,
          ]}
          disabled={!swapTargetExercise || isSwappingExercise}
          onPress={handleConfirmSwapExercise}
        >
          <Text style={styles.addExerciseSubmitText}>
            {isSwappingExercise ? "SWAPPING..." : "SWAP"}
          </Text>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={isAddExerciseModalVisible}
        onClose={handleCloseAddExerciseModal}
      >
        <Text style={styles.descriptionModalTitle}>Add Exercise</Text>
        <DropdownExerciseSelect
          selectedExercise={newExercise}
          setSelectedExercise={setNewExercise}
        />
        <View style={styles.addExerciseFieldRow}>
          <Text style={styles.addExerciseFieldLabel}>Sets</Text>
          <TextInput
            style={styles.addExerciseInput}
            keyboardType="numeric"
            value={newExerciseSets}
            onChangeText={setNewExerciseSets}
          />
        </View>
        <View style={styles.addExerciseFieldRow}>
          <Text style={styles.addExerciseFieldLabel}>Reps</Text>
          <TextInput
            style={styles.addExerciseInput}
            keyboardType="numeric"
            value={newExerciseReps}
            onChangeText={setNewExerciseReps}
          />
        </View>
        <View style={styles.addExerciseFieldRow}>
          <Text style={styles.addExerciseFieldLabel}>Rest (sec)</Text>
          <TextInput
            style={styles.addExerciseInput}
            keyboardType="numeric"
            value={newExerciseRestSeconds}
            onChangeText={setNewExerciseRestSeconds}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.addExerciseSubmitButton,
            (!newExercise || isAddingExercise) &&
              styles.addExerciseSubmitButtonDisabled,
          ]}
          disabled={!newExercise || isAddingExercise}
          onPress={handleSubmitAddExercise}
        >
          <Text style={styles.addExerciseSubmitText}>
            {isAddingExercise ? "ADDING..." : "ADD"}
          </Text>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={!!enlargedImage}
        onClose={() => setEnlargedImage(null)}
      >
        <Text style={styles.descriptionModalTitle}>{enlargedImage?.name}</Text>
        {enlargedImage && authImageHeaders && !enlargedImageFailed && (
          <Image
            source={{
              // The list thumbnail's URL points at a static-PNG conversion
              // of the exercise GIF (see backend exercises.service.ts) —
              // appending animated=true here fetches the original animated
              // GIF instead, since seeing the motion is the point of
              // viewing it enlarged. retry=N only changes on explicit
              // retry, to force a fresh request instead of replaying a
              // cached failure.
              uri: `${process.env.EXPO_PUBLIC_API_URL}${enlargedImage.url}&animated=true&retry=${enlargedImageRetryToken}`,
              headers: authImageHeaders,
            }}
            style={styles.enlargedImage}
            contentFit="contain"
            onError={() => setEnlargedImageFailed(true)}
          />
        )}
        {enlargedImage && enlargedImageFailed && (
          <View style={styles.enlargedImageError}>
            <Feather name="image" size={24} color={colors.textSecondary} />
            <Text style={styles.enlargedImageErrorText}>
              Couldn&apos;t load image
            </Text>
            <Button
              title="RETRY"
              variant="outline"
              style={styles.enlargedImageRetryButton}
              textStyle={{ fontSize: 12 }}
              onPress={() => {
                setEnlargedImageFailed(false);
                setEnlargedImageRetryToken((prev) => prev + 1);
              }}
            />
          </View>
        )}
      </Modal>
    </View>
  );
};

export default WorkoutDetail;
