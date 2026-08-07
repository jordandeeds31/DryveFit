import apiClient from "./client";
import {
  CardioSession,
  CardioSessionSummary,
  CreateCardioSessionInput,
} from "@/types/cardio.types";

export const getCardioSessions = async (): Promise<CardioSessionSummary[]> => {
  const { data } = await apiClient.get("/api/cardio");
  return data.result.sessions;
};

export const getCardioSession = async (id: string): Promise<CardioSession> => {
  const { data } = await apiClient.get(`/api/cardio/${id}`);
  return data.result.session;
};

export const createCardioSession = async (
  input: CreateCardioSessionInput,
): Promise<CardioSessionSummary> => {
  const { data } = await apiClient.post("/api/cardio", input);
  return data.result.session;
};

export const deleteCardioSession = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/cardio/${id}`);
};
