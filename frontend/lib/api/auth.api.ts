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
