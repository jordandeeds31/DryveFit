import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrograms,
  createProgram,
  getProgramById,
  getProgramSchedules,
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
