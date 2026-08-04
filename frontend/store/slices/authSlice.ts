import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { login, signup } from "@/lib/api/auth.api";
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

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await clearToken();
  queryClient.clear();
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
      .addCase(logoutThunk.fulfilled, (state) => {
        state.accessToken = null;
        state.isAuthenticated = false;
      });
  },
});

export default authSlice.reducer;
