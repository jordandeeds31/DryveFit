import apiClient from "./client";
import { AuthResponse, SigninPayload, SignupPayload } from "@/types/auth.types";

export const signup = async (payload: SignupPayload): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>(
    "/api/auth/signup",
    payload,
  );
  return data;
};

export const login = async (payload: SigninPayload): Promise<AuthResponse> => {
  const { data } = await apiClient.post<AuthResponse>(
    "/api/auth/login",
    payload,
  );
  return data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/auth/forgot-password",
    { email },
  );
  return data;
};

export const resetPassword = async (payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ message: string }> => {
  const { data } = await apiClient.post<{ message: string }>(
    "/api/auth/reset-password",
    payload,
  );
  return data;
};
