import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrograms,
  createProgram,
  getProgramById,
  getProgramSchedules,
  getProgramDay,
  logExercisePerformance,
  deleteExercisePerformance,
  deleteProgram,
  swapProgramExercise,
  addProgramExercise,
  revertDaySwaps,
  deleteProgramExercise,
  postponeProgramDay,
  inheritWorkoutDay,
  inheritWorkoutDayAsNewProgram,
  inheritStandaloneLogAsNewProgram,
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
      durationSecs,
    }: {
      programExerciseId: string;
      sets: Array<{ weight: number | null; reps: number }>;
      durationSecs?: number;
    }) => logExercisePerformance(programExerciseId, sets, durationSecs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["workingOutCount"] });
      queryClient.invalidateQueries({ queryKey: ["previousSession"] });
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
      queryClient.invalidateQueries({ queryKey: ["workingOutCount"] });
      queryClient.invalidateQueries({ queryKey: ["previousSession"] });
    },
  });
};

export const useSwapProgramExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      programExerciseId,
      newExerciseId,
    }: {
      programExerciseId: string;
      newExerciseId: string;
    }) => swapProgramExercise(programExerciseId, newExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
    },
  });
};

export const useAddProgramExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dayId,
      payload,
    }: {
      dayId: string;
      payload: {
        exerciseId: string;
        sets: number;
        reps: number;
        restSeconds: number;
        notes?: string;
      };
    }) => addProgramExercise(dayId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

export const useDeleteProgramExercise = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programExerciseId: string) =>
      deleteProgramExercise(programExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

export const useRevertDaySwaps = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dayId: string) => revertDaySwaps(dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

export const usePostponeProgramDay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dayId: string) => postponeProgramDay(dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

export const useInheritWorkoutDay = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dayId,
      force,
      rebalanceWithAI,
    }: {
      dayId: string;
      force?: boolean;
      rebalanceWithAI?: boolean;
    }) => inheritWorkoutDay(dayId, force, rebalanceWithAI),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

// For a viewer with no active program of their own — see
// inheritWorkoutDayAsNewProgram in programs.api.ts.
export const useInheritWorkoutDayAsNewProgram = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dayId, date }: { dayId: string; date: string }) =>
      inheritWorkoutDayAsNewProgram(dayId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

// For a viewer with no active program of their own — see
// inheritStandaloneLogAsNewProgram in programs.api.ts.
export const useInheritStandaloneLogAsNewProgram = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ logId, date }: { logId: string; date: string }) =>
      inheritStandaloneLogAsNewProgram(logId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (programId: string) => deleteProgram(programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["programDay"] });
      queryClient.invalidateQueries({ queryKey: ["workoutLogs"] });
      queryClient.invalidateQueries({ queryKey: ["1rmHistory"] });
    },
  });
};
