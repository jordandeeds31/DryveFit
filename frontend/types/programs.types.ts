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

export const TRAINING_SPLITS = [
  "full body",
  "upper / lower",
  "push / pull / legs",
  "bro split",
] as const;
export type TrainingSplit = (typeof TRAINING_SPLITS)[number];

export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

export const EQUIPMENT_ACCESS = [
  "full gym",
  "home gym (dumbbells + barbell)",
  "dumbbells only",
  "bodyweight only",
] as const;
export type EquipmentAccess = (typeof EQUIPMENT_ACCESS)[number];

export const TRAINING_GOALS = [
  "strength",
  "hypertrophy",
  "fat loss",
  "endurance",
  "general fitness",
] as const;
export type TrainingGoal = (typeof TRAINING_GOALS)[number];

export interface CreateProgramPayload {
  description?: string;
  startDate: string;
  durationDays: ProgramDurationDays;
  preferredDays: string[];
  trainingSplit: TrainingSplit;
  sessionMinutes: number;
  fitnessLevel: FitnessLevel;
  equipmentAccess: EquipmentAccess;
  trainingGoal: TrainingGoal;
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
  trainingSplit: string;
  sessionMinutes: number;
  fitnessLevel: string;
  equipmentAccess: string;
  trainingGoal: string;
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

export interface ProgramExerciseLogSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  durationSecs: number | null;
}

export interface ProgramExerciseLog {
  id: string;
  sets: ProgramExerciseLogSet[];
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
  recommendedWeight: number | null;
  originalExerciseName: string | null;
  originalMuscleGroup: string | null;
  imageUrl: string | null;
  equipment: string | null;
  exerciseLogs: ProgramExerciseLog[];
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
  completedCount: number;
  totalCount: number;
}

export interface ScheduleEntry {
  date: string;
  programDays: ScheduleDay[];
  hasStandaloneLog: boolean;
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
