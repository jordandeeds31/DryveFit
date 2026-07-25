import { ProgramDurationDays, BodyPart } from "./programs.prompts";

export interface CreateProgramInput {
  userId: string;
  name: string;
  description?: string;
  startDate: Date;
  durationDays: ProgramDurationDays;
  daysPerWeek: number;
  preferredDays: string[];
  focusArea: BodyPart[];
  sessionMinutes: number;
}
