import { TrainingGoal as TrainingGoalType } from "@/types/programs.types";

export interface TrainingGoalProps {
  trainingGoal: TrainingGoalType;
  setTrainingGoal: (trainingGoal: TrainingGoalType) => void;
}
