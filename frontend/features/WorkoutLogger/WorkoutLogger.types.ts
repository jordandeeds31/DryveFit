import { RefObject } from "react";
import { View } from "react-native";
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
  // Fired when an exercise entry's search dropdown opens — this component
  // has no access to the Modal it renders inside (see index.tsx), so
  // scrolling the entry into view has to be delegated up to whoever does.
  onRequestScrollIntoView?: (nodeRef: RefObject<View | null>) => void;
}

export interface WorkoutLoggerHandle {
  save: () => void;
  // Lets index.tsx's Modal `footer` (a static "+ ADD EXERCISE" button,
  // pinned below the scrollable content) trigger this component's
  // internal add-a-blank-exercise-entry logic — same reasoning as `save`
  // already being lifted out for the header's SAVE button.
  addExercise: () => void;
}
