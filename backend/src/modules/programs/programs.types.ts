import {
  ProgramDurationDays,
  TrainingSplit,
  FitnessLevel,
  EquipmentAccess,
  TrainingGoal,
} from "./programs.prompts";

export interface CreateProgramInput {
  userId: string;
  description?: string;
  startDate: Date;
  durationDays: ProgramDurationDays;
  daysPerWeek: number;
  preferredDays: string[];
  trainingSplit: TrainingSplit;
  sessionMinutes: number;
  fitnessLevel: FitnessLevel;
  equipmentAccess: EquipmentAccess;
  trainingGoal: TrainingGoal;
}
