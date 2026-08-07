import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import cinematicTimerReducer from "./slices/cinematicTimerSlice";
import cardioSessionReducer from "./slices/cardioSessionSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    subscription: subscriptionReducer,
    cinematicTimer: cinematicTimerReducer,
    cardioSession: cardioSessionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
