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

export interface WorkoutLoggerProps {
  setClose: (value: boolean) => void;
  date: string;
  initialWorkoutLogs: WorkoutLog[];
}
