export type Gender = "male" | "female";
export type UnitSystem = "metric" | "imperial";

export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  city: string | null;
  gender: Gender | null;
  isLeaderboardVisible: boolean;
  profileImageUrl: string | null;
  // Null until detected (see lib/location/detectUnitSystem.ts) or set
  // manually in Profile settings — every read site treats null the same
  // as "imperial".
  unitSystem: UnitSystem | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowedByViewer: boolean;
}

export interface UserSearchResult {
  id: string;
  username: string | null;
  profileImageUrl: string | null;
  isFollowedByViewer: boolean;
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

export interface PublicNutritionEntry {
  id: string;
  foodName: string;
  brandName: string | null;
  servingQty: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface PublicNutritionDay {
  date: string;
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  meals: Record<"breakfast" | "lunch" | "dinner" | "snacks", PublicNutritionEntry[]>;
}
