import { FitnessLevel as FitnessLevelType } from "@/types/programs.types";

export interface FitnessLevelProps {
  fitnessLevel: FitnessLevelType;
  setFitnessLevel: (level: FitnessLevelType) => void;
}
