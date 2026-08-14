import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PendingWorkoutExercise {
  exerciseName: string;
  muscleGroup: string;
  equipment: string | null;
}

interface PendingWorkoutState {
  // Set when a workout is inherited from someone's profile but the viewer
  // has no active program to slot it into — index.tsx picks this up on
  // the next mount and opens the standalone Log Workout flow pre-filled
  // with these exercises, then clears it. Not persisted; a fresh app
  // launch always starts with nothing pending.
  exercises: PendingWorkoutExercise[] | null;
}

const initialState: PendingWorkoutState = {
  exercises: null,
};

const pendingWorkoutSlice = createSlice({
  name: "pendingWorkout",
  initialState,
  reducers: {
    setPendingWorkout: (
      state,
      action: PayloadAction<PendingWorkoutExercise[]>,
    ) => {
      state.exercises = action.payload;
    },
    clearPendingWorkout: (state) => {
      state.exercises = null;
    },
  },
});

export const { setPendingWorkout, clearPendingWorkout } =
  pendingWorkoutSlice.actions;
export default pendingWorkoutSlice.reducer;
