import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CardioActivityType, CardioRoutePoint } from "@/types/cardio.types";
import { UnitSystem } from "@/types/user.types";

export interface ActiveCardioSession {
  activityType: CardioActivityType;
  // Denormalized from the user's profile at session-start time, rather
  // than looked up live — the background location task (see
  // cardioBackgroundLocation.ts) runs outside the React tree entirely (no
  // hooks, no query cache) but still needs this to format the Live
  // Activity's distance/pace text in the right unit system.
  unitSystem: UnitSystem;
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
    startSession: (
      state,
      action: PayloadAction<{
        activityType: CardioActivityType;
        unitSystem: UnitSystem;
      }>,
    ) => {
      state.active = {
        activityType: action.payload.activityType,
        unitSystem: action.payload.unitSystem,
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
    clearSession: (state) => {
      state.active = null;
    },
  },
});

export const {
  startSession,
  restoreSession,
  pauseSession,
  resumeSession,
  clearSession,
} = cardioSessionSlice.actions;
export default cardioSessionSlice.reducer;
