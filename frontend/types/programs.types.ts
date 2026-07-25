export const PROGRAM_DURATION_OPTIONS = [30, 60, 90] as const;
export type ProgramDurationDays = (typeof PROGRAM_DURATION_OPTIONS)[number];

export const SESSION_MINUTES_OPTIONS = [30, 45, 60, 90] as const;

export const DAYS_OF_WEEK = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thr",
  "fri",
  "sat",
] as const;

export const BODY_PARTS = [
  "chest",
  "back",
  "lats",
  "traps",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "lower back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "hip flexors",
  "adductors",
  "abductors",
  "full body",
  "cardio",
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export interface CreateProgramPayload {
  description?: string;
  startDate: string;
  durationDays: ProgramDurationDays;
  preferredDays: string[];
  focusArea: BodyPart[];
  sessionMinutes: number;
}

export interface Program {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  daysPerWeek: number;
  preferredDays: string[];
  focusArea: string[];
  sessionMinutes: number;
  generationStatus: string;
  generationStep: string | null;
  generationStepIndex: number | null;
  generationMessage: string | null;
  generationError: string | null;
  totalSessions: number;
  generatedSessions: number;
  generatedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramExercise {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes?: string | null;
  order: number;
  isCompleted: boolean;
}

export interface ProgramDay {
  id: string;
  dayNumber: number;
  dayName: string;
  date: string;
  focus: string;
  isRestDay: boolean;
  exercises: ProgramExercise[];
}

export interface ProgramWeek {
  id: string;
  weekNumber: number;
  days: ProgramDay[];
}

export interface ProgramWithWeeks extends Program {
  weeks: ProgramWeek[];
}

export interface ScheduleDay {
  id: string;
  programId: string;
  programName: string;
  dayNumber: number;
  title: string;
  isCompleted: boolean;
}

export interface ScheduleEntry {
  date: string;
  programDays: ScheduleDay[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  code: string;
  result: T;
}

export type ProgramsResponse = ApiEnvelope<{ programs: Program[] }>;
export type CreateProgramResponse = ApiEnvelope<{ program: Program }>;
export type ProgramDetailResponse = ApiEnvelope<{ program: ProgramWithWeeks }>;
export type DeactivateProgramResponse = ApiEnvelope<{ program: Program }>;
export type ScheduleResponse = ApiEnvelope<{ schedule: ScheduleEntry[] }>;
export type ProgramDayResponse = ApiEnvelope<{
  day: ProgramDay & { week: { weekNumber: number } };
}>;
