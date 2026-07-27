import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrograms,
  createProgram,
  getProgramById,
  getProgramSchedules,
  getProgramDay,
  logExercisePerformance,
  deleteExercisePerformance,
} from "@/lib/api/programs.api";

export const usePrograms = () => {
  return useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
};

export const useProgramGenerationStatus = (programId: string | null) => {
  return useQuery({
    queryKey: ["program", programId],
    queryFn: () => getProgramById(programId!),
    enabled: !!programId,
    refetchInterval: (query) => {
      const status = query.state.data?.generationStatus;
      return status === "completed" || status === "failed" ? false : 2000;
    },
  });
};

export const useSchedule = () => {
  return useQuery({
    queryKey: ["schedule"],
    queryFn: getProgramSchedules,
  });
};

export const useProgramDay = (
  programId: string | null,
  date: string | null,
) => {
  return useQuery({
    queryKey: ["programDay", programId, date],
    queryFn: () => getProgramDay(programId!, date!),
    enabled: !!programId && !!date,
  });
};

export const useLogExercisePerformance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programExerciseId,
      sets,
    }: {
      programExerciseId: string;
      sets: Array<{ weight: number; reps: number }>;
    }) => logExercisePerformance(programExerciseId, sets),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
    },
  });
};

export const useDeleteExercisePerformance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programExerciseId: string) =>
      deleteExercisePerformance(programExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
    },
  });
};
