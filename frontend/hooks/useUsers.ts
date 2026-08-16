import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  updateProfile,
  uploadProfileImage,
  deleteProfileImage,
  deleteAccount,
  getPublicProfile,
  getPublicWorkoutHistory,
  getPublicActiveProgram,
  getPublicNutritionHistory,
  getPublicPosts,
} from "@/lib/api/users.api";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });
};

export const usePublicProfile = (userId: string | null) => {
  return useQuery({
    queryKey: ["publicProfile", userId],
    queryFn: () => getPublicProfile(userId!),
    enabled: !!userId,
  });
};

export const usePublicWorkoutHistory = (userId: string | null) => {
  return useQuery({
    queryKey: ["publicWorkoutHistory", userId],
    queryFn: () => getPublicWorkoutHistory(userId!),
    enabled: !!userId,
  });
};

export const usePublicActiveProgram = (userId: string | null) => {
  return useQuery({
    queryKey: ["publicActiveProgram", userId],
    queryFn: () => getPublicActiveProgram(userId!),
    enabled: !!userId,
  });
};

export const usePublicNutritionHistory = (userId: string | null) => {
  return useQuery({
    queryKey: ["publicNutritionHistory", userId],
    queryFn: () => getPublicNutritionHistory(userId!),
    enabled: !!userId,
  });
};

export const usePublicPosts = (userId: string | null) => {
  return useQuery({
    queryKey: ["publicPosts", userId],
    queryFn: () => getPublicPosts(userId!),
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      // Username/city/visibility changes all affect leaderboard results —
      // invalidate every exercise/scope combination cached so far, not
      // just whichever one happens to be on screen right now.
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};

export const useUploadProfileImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};

export const useDeleteProfileImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfileImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
};

// No cache invalidation on success — the caller logs the user out and
// navigates to signin right after, at which point every cached query for
// this account is about to be torn down anyway.
export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: deleteAccount,
  });
};
