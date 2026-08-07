import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CardioActivityType, CardioRoutePoint } from "@/types/cardio.types";
import { haversineDistanceMeters } from "@/lib/utils/geo.utils";

interface ActiveCardioSession {
  activityType: CardioActivityType;
  // Real timestamp (Date.now()), not a running counter — elapsed time is
  // always derived as `Date.now() - startedAt - totalPausedMs`, the same
  // pattern cinematicTimerSlice uses, so it survives the screen
  // unmounting/backgrounding instead of resetting.
  startedAt: number;
  pausedAt: number | null;
  totalPausedMs: number;
  routePoints: CardioRoutePoint[];
  distanceMeters: number;
  // Accumulated across the whole session (not just the latest poll) so an
  // average/max can be computed at the end — same reason
  // cinematicTimerSlice accumulates heartRateSamples rather than keeping
  // only the most recent reading.
  heartRateSamples: number[];
  caloriesBurned: number;
}

interface CardioSessionState {
  active: ActiveCardioSession | null;
}

const initialState: CardioSessionState = {
  active: null,
};

const cardioSessionSlice = createSlice({
  name: "cardioSession",
  initialState,
  reducers: {
    startSession: (state, action: PayloadAction<CardioActivityType>) => {
      state.active = {
        activityType: action.payload,
        startedAt: Date.now(),
        pausedAt: null,
        totalPausedMs: 0,
        routePoints: [],
        distanceMeters: 0,
        heartRateSamples: [],
        caloriesBurned: 0,
      };
    },
    addRoutePoint: (state, action: PayloadAction<CardioRoutePoint>) => {
      if (!state.active || state.active.pausedAt != null) return;

      const point = action.payload;
      const lastPoint =
        state.active.routePoints[state.active.routePoints.length - 1];

      if (lastPoint) {
        state.active.distanceMeters += haversineDistanceMeters(
          lastPoint,
          point,
        );
      }

      state.active.routePoints.push(point);
    },
    pauseSession: (state) => {
      if (state.active && state.active.pausedAt == null) {
        state.active.pausedAt = Date.now();
      }
    },
    resumeSession: (state) => {
      if (state.active && state.active.pausedAt != null) {
        state.active.totalPausedMs += Date.now() - state.active.pausedAt;
        state.active.pausedAt = null;
      }
    },
    recordHeartRateSample: (state, action: PayloadAction<number>) => {
      state.active?.heartRateSamples.push(action.payload);
    },
    setCaloriesBurned: (state, action: PayloadAction<number>) => {
      if (state.active) {
        state.active.caloriesBurned = action.payload;
      }
    },
    clearSession: (state) => {
      state.active = null;
    },
  },
});

export const {
  startSession,
  addRoutePoint,
  pauseSession,
  resumeSession,
  recordHeartRateSample,
  setCaloriesBurned,
  clearSession,
} = cardioSessionSlice.actions;
export default cardioSessionSlice.reducer;
