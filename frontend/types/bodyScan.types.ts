import { Gender } from "@/types/user.types";

export interface BodyScan {
  id: string;
  heightCm: number;
  weightKg: number;
  age: number;
  gender: Gender;
  bodyFatPercentage: number;
  bodyFatCategory: string;
  leanMassKg: number;
  muscleScore: number;
  bodyType: string;
  symmetryScore: number;
  fitnessScore: number;
  // Opaque passthrough — WorkoutX doesn't pin these shapes down further
  // than "object" in their docs, rendered generically.
  postureNotes: Record<string, unknown>;
  circumferences: Record<string, number>;
  confidenceScore: number;
  bmi: number;
  createdAt: string;
}

export interface SubmitBodyScanInput {
  photoUri: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: Gender;
}
