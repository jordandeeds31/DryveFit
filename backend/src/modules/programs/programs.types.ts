import {
  TrainingSplit,
  FitnessLevel,
  EquipmentAccess,
  TrainingGoal,
} from "./programs.prompts";

export interface CreateProgramInput {
  userId: string;
  description?: string;
  startDate: Date;
  // The client device's own current local date (YYYY-MM-DD) — used to
  // validate startDate isn't in the past without the server's own clock/
  // timezone (independent of the user's) entering into that comparison.
  todayDateKey: string;
  daysPerWeek: number;
  preferredDays: string[];
  trainingSplit: TrainingSplit;
  sessionMinutes: number;
  fitnessLevel: FitnessLevel;
  equipmentAccess: EquipmentAccess;
  trainingGoal: TrainingGoal;
}
