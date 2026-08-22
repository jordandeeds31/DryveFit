import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CardioActivityType, CardioRoutePoint } from "@/types/cardio.types";
import { haversineDistanceMeters } from "@/lib/utils/geo.utils";

export interface ActiveCardioSession {
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
  stepCount: number;
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
        stepCount: 0,
      };
    },
    // Rehydrates a session from the persisted snapshot (see
    // cardioSessionPersistence.ts) — used when this screen mounts and finds
    // no in-memory `active` session (Redux is purely in-memory, so a full
    // app relaunch during a backgrounded walk loses it) but a snapshot was
    // saved to disk before that relaunch. Distinct from startSession, which
    // always begins a brand new session at Date.now().
    restoreSession: (state, action: PayloadAction<ActiveCardioSession>) => {
      state.active = action.payload;
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
    setStepCount: (state, action: PayloadAction<number>) => {
      if (state.active) {
        state.active.stepCount = action.payload;
      }
    },
    clearSession: (state) => {
      state.active = null;
    },
  },
});

export const {
  startSession,
  restoreSession,
  addRoutePoint,
  pauseSession,
  resumeSession,
  recordHeartRateSample,
  setCaloriesBurned,
  setStepCount,
  clearSession,
} = cardioSessionSlice.actions;
export default cardioSessionSlice.reducer;
