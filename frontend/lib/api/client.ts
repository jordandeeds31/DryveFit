import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { setToken, getToken, clearToken } from "../storage/secureStore";
import { router } from "expo-router";

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

    if (status === 401) {
      await clearToken();
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
