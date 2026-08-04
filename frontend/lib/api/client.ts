import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { setToken, getToken, clearToken } from "../storage/secureStore";
import { router } from "expo-router";
import { queryClient } from "./queryClient";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ?? error.message ?? "Something went wrong";

    // Login/signup return 401 for wrong credentials, not an expired
    // session — that shouldn't clear the token or redirect (the user is
    // already on the signin screen), just surface as an inline error.
    const isAuthEndpoint = error.config?.url?.includes("/api/auth/");

    if (status === 401 && !isAuthEndpoint) {
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
