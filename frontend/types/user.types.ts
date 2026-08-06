export type Gender = "male" | "female";

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  city: string | null;
  gender: Gender | null;
  isLeaderboardVisible: boolean;
  profileImageUrl: string | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
}

export interface PublicWorkoutLogSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
}

export interface PublicWorkoutLogExercise {
  id: string;
  exerciseName: string;
  muscleGroup: string;
  sets: PublicWorkoutLogSet[];
}

export interface PublicWorkoutLog {
  id: string;
  loggedAt: string;
  exercises: PublicWorkoutLogExercise[];
}
