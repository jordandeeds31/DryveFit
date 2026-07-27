import {
  ProgramDurationDays,
  BodyPart,
  FitnessLevel,
} from "./programs.prompts";

export interface CreateProgramInput {
  userId: string;
  description?: string;
  startDate: Date;
  durationDays: ProgramDurationDays;
  daysPerWeek: number;
  preferredDays: string[];
  focusArea: BodyPart[];
  sessionMinutes: number;
  fitnessLevel: FitnessLevel;
}
