export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string | null;
  imageUrl: string | null;
  isCompound: boolean;
  createdAt: string;
}

export interface OneRepMaxEntry {
  date: string;
  estimated1RM: number;
  sets: Array<{
    id: string;
    setNumber: number;
    weight: number | null;
    reps: number | null;
  }>;
}
