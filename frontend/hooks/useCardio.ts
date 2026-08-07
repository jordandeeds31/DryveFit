import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCardioSessions,
  getCardioSession,
  createCardioSession,
  deleteCardioSession,
} from "@/lib/api/cardio.api";

export const useCardioSessions = () => {
  return useQuery({
    queryKey: ["cardioSessions"],
    queryFn: getCardioSessions,
  });
};

export const useCardioSession = (id: string | null) => {
  return useQuery({
    queryKey: ["cardioSessions", id],
    queryFn: () => getCardioSession(id!),
    enabled: !!id,
  });
};

export const useCreateCardioSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCardioSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cardioSessions"] });
    },
  });
};

export const useDeleteCardioSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCardioSession,
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["cardioSessions"] });
      queryClient.removeQueries({ queryKey: ["cardioSessions", id] });
    },
  });
};
