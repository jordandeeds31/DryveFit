import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { login, signup, googleAuth } from "@/lib/api/auth.api";
import { clearPushToken } from "@/lib/api/users.api";
import { getToken, setToken, clearToken } from "@/lib/storage/secureStore";
import { queryClient } from "@/lib/api/queryClient";

interface AuthState {
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async () => {
    const accessToken = await getToken();
    return accessToken ?? null;
  },
);

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await login({ email, password });
      // Wipe any cached data from a previous session (programs, schedule,
      // currentUser, etc.) before this session's queries start firing —
      // otherwise a different account can briefly (or not-so-briefly,
      // given the 5 min staleTime) render the last user's data.
      queryClient.clear();
      await setToken(response.accessToken);
      return response.accessToken;
    } catch (error: any) {
      return rejectWithValue(error?.message ?? "Login failed");
    }
  },
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await signup({ email, password });
      // Same reasoning as loginThunk — clear stale cross-account cache
      // before this session's queries start firing.
      queryClient.clear();
      await setToken(response.accessToken);
      return response.accessToken;
    } catch (error: any) {
      return rejectWithValue(error?.message ?? "Registration failed");
    }
  },
);

export const googleAuthThunk = createAsyncThunk(
  "auth/googleAuth",
  async (idToken: string, { rejectWithValue }) => {
    try {
      const response = await googleAuth(idToken);
      // Same reasoning as loginThunk/registerThunk — clear stale
      // cross-account cache before this session's queries start firing.
      queryClient.clear();
      await setToken(response.accessToken);
      return { accessToken: response.accessToken, isNewUser: response.isNewUser };
    } catch (error: any) {
      return rejectWithValue(error?.message ?? "Google sign-in failed");
    }
  },
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  // Must happen before clearToken() below — this needs the still-present
  // auth header. Without this, this device's push token stays attached
  // to the account signing out; the next account that logs in on this
  // same device gets a fresh token of their own (see updatePushToken's
  // reassignment), but until then the signing-out account could still
  // receive a push delivered to whoever's now holding the device. A
  // failure here (offline, etc.) shouldn't block sign-out over it.
  await clearPushToken().catch(() => {});
  await clearToken();
  // Deliberately NOT queryClient.clear() here — loginThunk/registerThunk
  // already clear the cache before the next session's queries fire, and
  // clearing it here instead, while screens with actively-polling queries
  // (e.g. AppHeader's unread-notification count) are still mounted on the
  // way out, made every one of them immediately refetch with no token,
  // 401, and hit apiClient's interceptor, which redirects to signin on
  // its own — a redundant second navigation stacked right behind the
  // explicit one in the sign-out handler, which showed up as the signin
  // screen flashing twice.
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.accessToken = action.payload;
        state.isAuthenticated = !!action.payload;
        state.isLoading = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      })
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Login failed";
      })
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Registration failed";
      })
      .addCase(googleAuthThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleAuthThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(googleAuthThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) ?? "Google sign-in failed";
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.accessToken = null;
        state.isAuthenticated = false;
      });
  },
});

export default authSlice.reducer;
