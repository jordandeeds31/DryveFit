export interface LiveActivityContentStateInput {
  startedAtMs: number;
  pausedAtMs?: number;
  totalPausedSeconds: number;
  // Pre-formatted via lib/utils/units.ts (displayDistance, formatPace) —
  // the app's one metric/imperial conversion path never gets duplicated
  // in Swift.
  distanceText: string;
  paceText: string;
  caloriesBurned: number;
  stepCount: number;
  currentHeartRate?: number;
}

export interface LiveActivityModuleInterface {
  isSupported(): boolean;
  startActivity(activityType: string, startedAtMs: number): Promise<void>;
  updateActivity(state: LiveActivityContentStateInput): Promise<void>;
  endActivity(): Promise<void>;
}
