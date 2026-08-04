import { ProgramExercise } from "@/types/programs.types";

export interface DayDetail {
  id: string;
  dayNumber: number;
  dayName: string;
  date: string;
  focus: string;
  isRestDay: boolean;
  exercises: ProgramExercise[];
  week: { weekNumber: number };
}

export interface WorkoutDetailProps {
  dayDetail: DayDetail | undefined;
  isLoading: boolean;
  programId: string | null;
}
