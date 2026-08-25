import { useState } from "react";
import { View, Text } from "react-native";
import {
  FitnessLevel as FitnessLevelType,
  EquipmentAccess as EquipmentAccessType,
  TrainingGoal as TrainingGoalType,
  TrainingSplit as TrainingSplitType,
} from "@/types/programs.types";
import { toDateKey } from "@/lib/utils/date.utils";
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
  // Distinct from onGeneratingChange: this covers the whole generation/
  // result view (in-progress AND failed), not just "actively generating"
  // — the outer Modal uses it to switch its own chrome (the bottom-sheet
  // treatment is only for the question form; the generation view should
  // stay a plain centered box, on failure too).
  onViewChange?: (isGenerationView: boolean) => void;
}

// Strips the time-of-day, keeping only the local calendar date — so
// "startDate" always represents local midnight, never whatever time
// the user happened to tap the button.
const normalizeToLocalMidnight = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const ProgramBuilder = ({
  onCreated,
  onGeneratingChange,
  onViewChange,
}: ProgramBuilderProps) => {
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
        todayDateKey: toDateKey(new Date()),
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
          onViewChange?.(true);
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
    onViewChange?.(false);
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
      <Text style={styles.subtitle}>
        Answer a few quick questions to generate your personalized plan.
      </Text>
      <View style={styles.programFormContainer}>
        <View style={styles.section}>
          <StartDate startDate={startDate} setStartDate={setStartDate} />
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
