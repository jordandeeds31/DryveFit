import { ProgramExercise } from "@/types/programs.types";

export interface SetEntry {
  id: string;
  weight: string;
  reps: string;
}

export interface LogExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  exercise?: ProgramExercise;
  sets: SetEntry[];
  onSetsChange: (sets: SetEntry[]) => void;
}
