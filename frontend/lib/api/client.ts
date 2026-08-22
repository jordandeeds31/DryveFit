import { Platform } from "react-native";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { setToken, getToken, clearToken } from "../storage/secureStore";
import { router } from "expo-router";
import { queryClient } from "./queryClient";

// The Android emulator runs in its own virtual network where "localhost"
// refers to the emulator itself, not the host machine — 10.0.2.2 is the
// documented alias back to the host's localhost. iOS Simulator shares the
// host's network directly, so it needs no rewrite; only touches local dev
// URLs, never a real deployed API_URL.
const resolveBaseURL = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (Platform.OS === "android" && url.includes("localhost")) {
    return url.replace("localhost", "10.0.2.2");
  }
  return url;
};

const apiClient = axios.create({
  baseURL: resolveBaseURL(process.env.EXPO_PUBLIC_API_URL),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Guards against handling more than one 401 per "logged out" episode.
// Without this, every request still in flight at the moment of sign-out
// (background polls, a websocket reconnect attempt, ...) that resolves
// with a 401 independently re-runs the whole clear-and-redirect block
// below — each `router.replace("/(auth)/signin")` remounts that screen
// fresh, wiping out whatever the user has already typed into it. Reset
// on the next successful response, which happens naturally once they've
// signed back in.
let isHandlingUnauthorized = false;

apiClient.interceptors.response.use(
  (response) => {
    isHandlingUnauthorized = false;
    return response;
  },
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ?? error.message ?? "Something went wrong";

    // Login/signup return 401 for wrong credentials, not an expired
    // session — that shouldn't clear the token or redirect (the user is
    // already on the signin screen), just surface as an inline error.
    const isAuthEndpoint = error.config?.url?.includes("/api/auth/");

    if (status === 401 && !isAuthEndpoint && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      await clearToken();
      queryClient.clear();
      router.replace("/(auth)/signin");
    }

    // Normalize into a consistent shape every feature can rely on
    return Promise.reject({
      status: status ?? 0,
      message,
      original: error,
    });
  },
);

export default apiClient;
