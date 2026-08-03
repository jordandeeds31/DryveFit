export interface ExerciseSetLog {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export interface ExerciseLog {
  id: string;
  exerciseName: string;
  muscleGroup: string | null;
  equipment: string | null;
  sets: ExerciseSetLog[];
}

export interface WorkoutLog {
  id: string;
  loggedAt: string;
  exercises: ExerciseLog[];
}
