import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CinematicTimerState {
  // Real timestamps (Date.now()), not tick counts — elapsed time is always
  // derived as `Date.now() - startedAt`, so the timer keeps "running" even
  // while the cinematic-mode screen is unmounted (closed via X, backgrounded,
  // etc.) instead of resetting to zero on remount.
  startedAtByExerciseId: Record<string, number>;
  // Which exercise index the user last reached within a given day's
  // session (keyed by `${programId}:${date}`). Presence of a key means a
  // session was started and not yet finished — lets WorkoutDetail show
  // "RESUME" instead of "START" and lets cinematic-mode jump back to
  // where the user left off.
  currentIndexBySession: Record<string, number>;
  // Apple Health samples accumulated during a session (same session key as
  // above), so they survive closing/reopening cinematic-mode and are ready
  // to show on the recap screen once the session ends.
  healthMetricsBySession: Record<
    string,
    { heartRateSamples: number[]; caloriesBurned: number }
  >;
}

const initialState: CinematicTimerState = {
  startedAtByExerciseId: {},
  currentIndexBySession: {},
  healthMetricsBySession: {},
};

const cinematicTimerSlice = createSlice({
  name: "cinematicTimer",
  initialState,
  reducers: {
    startTimerIfNeeded: (state, action: PayloadAction<string>) => {
      const exerciseId = action.payload;
      if (!(exerciseId in state.startedAtByExerciseId)) {
        state.startedAtByExerciseId[exerciseId] = Date.now();
      }
    },
    clearTimer: (state, action: PayloadAction<string>) => {
      delete state.startedAtByExerciseId[action.payload];
    },
    setSessionIndex: (
      state,
      action: PayloadAction<{ sessionKey: string; index: number }>,
    ) => {
      state.currentIndexBySession[action.payload.sessionKey] =
        action.payload.index;
    },
    clearSession: (state, action: PayloadAction<string>) => {
      delete state.currentIndexBySession[action.payload];
      delete state.healthMetricsBySession[action.payload];
    },
    recordHeartRateSample: (
      state,
      action: PayloadAction<{ sessionKey: string; bpm: number }>,
    ) => {
      const { sessionKey, bpm } = action.payload;
      if (!state.healthMetricsBySession[sessionKey]) {
        state.healthMetricsBySession[sessionKey] = {
          heartRateSamples: [],
          caloriesBurned: 0,
        };
      }
      state.healthMetricsBySession[sessionKey].heartRateSamples.push(bpm);
    },
    setCaloriesBurned: (
      state,
      action: PayloadAction<{ sessionKey: string; calories: number }>,
    ) => {
      const { sessionKey, calories } = action.payload;
      if (!state.healthMetricsBySession[sessionKey]) {
        state.healthMetricsBySession[sessionKey] = {
          heartRateSamples: [],
          caloriesBurned: 0,
        };
      }
      state.healthMetricsBySession[sessionKey].caloriesBurned = calories;
    },
  },
});

export const {
  startTimerIfNeeded,
  clearTimer,
  setSessionIndex,
  clearSession,
  recordHeartRateSample,
  setCaloriesBurned,
} = cinematicTimerSlice.actions;
export default cinematicTimerSlice.reducer;
