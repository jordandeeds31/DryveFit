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

export const getProgramDay = async (programId: string, date: string) => {
  const { data } = await apiClient.get(
    `/api/programs/${programId}/day?date=${date}`,
  );
  return data.result.day;
};

export const logExercisePerformance = async (
  programExerciseId: string,
  sets: Array<{ weight: number | null; reps: number }>,
  durationSecs?: number,
) => {
  const { data } = await apiClient.post(
    `/api/programs/exercises/${programExerciseId}/log`,
    { sets, durationSecs },
  );
  return data.result.workoutLog;
};

export const deleteExercisePerformance = async (programExerciseId: string) => {
  const { data } = await apiClient.delete(
    `/api/programs/exercises/${programExerciseId}/log`,
  );
  return data;
};

export const swapProgramExercise = async (
  programExerciseId: string,
  newExerciseId: string,
) => {
  const { data } = await apiClient.patch(
    `/api/programs/exercises/${programExerciseId}/swap`,
    { newExerciseId },
  );
  return data.result.exercise;
};

export const addProgramExercise = async (
  dayId: string,
  payload: {
    exerciseId: string;
    sets: number;
    reps: number;
    restSeconds: number;
    notes?: string;
  },
) => {
  const { data } = await apiClient.post(
    `/api/programs/days/${dayId}/exercises`,
    payload,
  );
  return data.result.exercise;
};

export const deleteProgramExercise = async (programExerciseId: string) => {
  const { data } = await apiClient.delete(
    `/api/programs/exercises/${programExerciseId}`,
  );
  return data;
};

export const revertDaySwaps = async (dayId: string) => {
  const { data } = await apiClient.post(
    `/api/programs/days/${dayId}/revert-swaps`,
  );
  return data;
};

export const postponeProgramDay = async (dayId: string) => {
  const { data } = await apiClient.post(
    `/api/programs/days/${dayId}/postpone`,
  );
  return data;
};

export const deleteProgram = async (programId: string) => {
  const { data } = await apiClient.delete(`/api/programs/${programId}`);
  return data;
};

export const inheritWorkoutDay = async (dayId: string, force?: boolean) => {
  const { data } = await apiClient.post(
    `/api/programs/days/${dayId}/inherit`,
    { force },
  );
  return data.result;
};
