export type CardioActivityType = "walk" | "run" | "bike";

export interface CardioRoutePoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface CardioSessionSummary {
  id: string;
  activityType: CardioActivityType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  stepCount: number | null;
  createdAt: string;
}

export interface CardioSession extends CardioSessionSummary {
  route: CardioRoutePoint[];
}

export interface CreateCardioSessionInput {
  activityType: CardioActivityType;
  startedAt: string;
  endedAt: string;
  distanceMeters: number;
  caloriesBurned: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  stepCount: number | null;
  route: CardioRoutePoint[];
}
