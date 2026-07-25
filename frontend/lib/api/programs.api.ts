import apiClient from "./client";
import {
  Program,
  CreateProgramPayload,
  ScheduleEntry,
} from "@/types/programs.types";

export const getPrograms = async (): Promise<Program[]> => {
  const { data } = await apiClient.get("/api/programs");
  return data.result.programs;
};

export const createProgram = async (payload: CreateProgramPayload) => {
  const { data } = await apiClient.post("/api/programs", payload);
  return data.result.program;
};

export const getProgramById = async (programId: string) => {
  const { data } = await apiClient.get(`/api/programs/${programId}`);
  return data.result.program;
};

export const getProgramSchedules = async (): Promise<ScheduleEntry[]> => {
  const { data } = await apiClient.get("/api/programs/schedules");
  return data.result.schedule;
};
