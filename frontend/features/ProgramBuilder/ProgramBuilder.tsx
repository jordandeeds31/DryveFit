import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  ProgramDurationDays,
  FitnessLevel as FitnessLevelType,
  EquipmentAccess as EquipmentAccessType,
  TrainingGoal as TrainingGoalType,
  TrainingSplit as TrainingSplitType,
} from "@/types/programs.types";
import Duration from "./components/Duration/Duration";
import SelectedDays from "./components/SelectedDays/SelectedDays";
import SessionMinutes from "./components/SessionMinutes/SessionMinutes";
import TrainingSplit from "./components/TrainingSplit/TrainingSplit";
import FitnessLevel from "./components/FitnessLevel/FitnessLevel";
import EquipmentAccess from "./components/EquipmentAccess/EquipmentAccess";
import TrainingGoal from "./components/TrainingGoal/TrainingGoal";
import styles from "./ProgramBuilder.styles";
import Button from "@/components/shared/Button/Button";
import { useCreateProgram } from "@/hooks/usePrograms";
import ProgramGenerationModal from "./components/ProgramGenerationModal/ProgramGenerationModal";

interface ProgramBuilderProps {
  onCancel: () => void;
  onCreated?: () => void;
}

// Strips the time-of-day, keeping only the local calendar date — so
// "startDate" always represents local midnight, never whatever time
// the user happened to tap the button.
const normalizeToLocalMidnight = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const ProgramBuilder = ({ onCancel, onCreated }: ProgramBuilderProps) => {
  const [durationDays, setDurationDays] = useState<ProgramDurationDays>(30);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [sessionMinutes, setSessionMinutes] = useState<number>(30);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [trainingSplit, setTrainingSplit] =
    useState<TrainingSplitType>("full body");
  const [fitnessLevel, setFitnessLevel] =
    useState<FitnessLevelType>("beginner");
  const [equipmentAccess, setEquipmentAccess] =
    useState<EquipmentAccessType>("full gym");
  const [trainingGoal, setTrainingGoal] =
    useState<TrainingGoalType>("general fitness");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generatingProgramId, setGeneratingProgramId] = useState<string | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  const { mutate: createProgram, isPending } = useCreateProgram();

  const handleBuildProgram = () => {
    setValidationError(null);

    if (selectedDays.length === 0) {
      setValidationError("Select at least one preferred day.");
      return;
    }

    createProgram(
      {
        startDate: normalizeToLocalMidnight(startDate).toISOString(),
        durationDays,
        preferredDays: selectedDays,
        trainingSplit,
        sessionMinutes,
        fitnessLevel,
        equipmentAccess,
        trainingGoal,
      },
      {
        onSuccess: (program) => {
          setGeneratingProgramId(program.id);
          setModalVisible(true);
        },
        onError: (error: any) => {
          setValidationError(
            error?.message ?? "Something went wrong. Please try again.",
          );
        },
      },
    );
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setGeneratingProgramId(null);
    onCreated?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.programFormContainer}>
        <Duration
          durationDays={durationDays}
          setDurationDays={setDurationDays}
        />
        <SelectedDays
          selectedDays={selectedDays}
          setSelectedDays={setSelectedDays}
        />
        <SessionMinutes
          sessionMinutes={sessionMinutes}
          setSessionMinutes={setSessionMinutes}
        />
        <TrainingSplit
          trainingSplit={trainingSplit}
          setTrainingSplit={setTrainingSplit}
        />
        <FitnessLevel
          fitnessLevel={fitnessLevel}
          setFitnessLevel={setFitnessLevel}
        />
        <EquipmentAccess
          equipmentAccess={equipmentAccess}
          setEquipmentAccess={setEquipmentAccess}
        />
        <TrainingGoal
          trainingGoal={trainingGoal}
          setTrainingGoal={setTrainingGoal}
        />
      </View>
      {validationError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelButton}
          disabled={isPending}
        >
          <Text style={styles.cancel}>CANCEL</Text>
        </TouchableOpacity>
        <Button
          title={isPending ? "BUILDING..." : "BUILD & ACTIVATE PROGRAM"}
          onPress={handleBuildProgram}
          disabled={isPending}
        />
      </View>
      <ProgramGenerationModal
        visible={modalVisible}
        programId={generatingProgramId}
        onClose={handleModalClose}
      />
    </View>
  );
};

export default ProgramBuilder;
