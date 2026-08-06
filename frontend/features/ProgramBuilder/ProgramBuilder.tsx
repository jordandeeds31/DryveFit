import { useState } from "react";
import { View, Text } from "react-native";
import {
  ProgramDurationDays,
  FitnessLevel as FitnessLevelType,
  EquipmentAccess as EquipmentAccessType,
  TrainingGoal as TrainingGoalType,
  TrainingSplit as TrainingSplitType,
} from "@/types/programs.types";
import Duration from "./components/Duration/Duration";
import StartDate from "./components/StartDate/StartDate";
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
  onCreated?: () => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
}

// Strips the time-of-day, keeping only the local calendar date — so
// "startDate" always represents local midnight, never whatever time
// the user happened to tap the button.
const normalizeToLocalMidnight = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const ProgramBuilder = ({ onCreated, onGeneratingChange }: ProgramBuilderProps) => {
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
    onGeneratingChange?.(false);
    onCreated?.();
  };

  if (modalVisible) {
    return (
      <ProgramGenerationModal
        visible={modalVisible}
        programId={generatingProgramId}
        onClose={handleModalClose}
        onInProgressChange={onGeneratingChange}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Build Your Program</Text>
      <Text style={styles.subtitle}>
        Answer a few questions and we'll generate a personalized training
        program for you.
      </Text>
      <View style={styles.programFormContainer}>
        <View style={styles.section}>
          <StartDate startDate={startDate} setStartDate={setStartDate} />
        </View>
        <View style={styles.section}>
          <Duration
            durationDays={durationDays}
            setDurationDays={setDurationDays}
          />
        </View>
        <View style={styles.section}>
          <SelectedDays
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
          />
        </View>
        <View style={styles.section}>
          <SessionMinutes
            sessionMinutes={sessionMinutes}
            setSessionMinutes={setSessionMinutes}
          />
        </View>
        <View style={styles.section}>
          <TrainingSplit
            trainingSplit={trainingSplit}
            setTrainingSplit={setTrainingSplit}
          />
        </View>
        <View style={styles.section}>
          <FitnessLevel
            fitnessLevel={fitnessLevel}
            setFitnessLevel={setFitnessLevel}
          />
        </View>
        <View style={styles.section}>
          <EquipmentAccess
            equipmentAccess={equipmentAccess}
            setEquipmentAccess={setEquipmentAccess}
          />
        </View>
        <View style={[styles.section, styles.lastSection]}>
          <TrainingGoal
            trainingGoal={trainingGoal}
            setTrainingGoal={setTrainingGoal}
          />
        </View>
      </View>
      {validationError && (
        <Text style={styles.errorText}>{validationError}</Text>
      )}
      <Button
        title={isPending ? "BUILDING..." : "BUILD & ACTIVATE PROGRAM"}
        onPress={handleBuildProgram}
        disabled={isPending}
        style={styles.buildButton}
      />
    </View>
  );
};

export default ProgramBuilder;
