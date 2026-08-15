import { Exercise } from "@/types/exercise.types";

interface ExerciseSetLog {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

interface ExerciseLog {
  id: string;
  exerciseName: string;
  muscleGroup: string | null;
  sets: ExerciseSetLog[];
}

interface WorkoutLog {
  id: string;
  loggedAt: string;
  exercises: ExerciseLog[];
}

export interface PrefillExercise {
  exerciseName: string;
  muscleGroup: string;
  equipment: string | null;
}

export interface WorkoutLoggerProps {
  setClose: (value: boolean) => void;
  date: string;
  initialWorkoutLogs: WorkoutLog[];
  onSaved?: (message: string) => void;
  // Pre-selects these exercises (one empty set each, ready to fill in)
  // instead of starting from a single blank entry — used when a workout
  // is inherited from someone's profile but the viewer has no active
  // program to slot it into, so it lands here instead.
  prefillExercises?: PrefillExercise[];
  onDirtyChange?: (isDirty: boolean) => void;
  onSavingChange?: (isSaving: boolean) => void;
}

export interface WorkoutLoggerHandle {
  save: () => void;
}
