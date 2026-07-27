import { Exercise } from "@/types/exercise.types";

export interface DropdownExerciseSelectProps {
  selectedExercise: Exercise | null;
  setSelectedExercise: (exercise: Exercise | null) => void;
}
