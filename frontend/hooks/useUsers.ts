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
  searchUsers,
  followUser,
  unfollowUser,
} from "@/lib/api/users.api";
import { PublicProfile, UserSearchResult } from "@/types/user.types";

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

export const usePublicNutritionHistory = (
  userId: string | null,
  monthKey?: string,
) => {
  return useQuery({
    queryKey: ["publicNutritionHistory", userId, monthKey ?? "current"],
    queryFn: () => getPublicNutritionHistory(userId!, monthKey),
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

export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ["searchUsers", query],
    queryFn: () => searchUsers(query),
    enabled: query.trim().length >= 2,
  });
};

// Toggles follow/unfollow with an optimistic update against both places a
// follow state can be shown at once: the profile screen's own cache entry
// and any currently-cached search results list — same reasoning as
// useToggleLike in usePosts.ts.
export const useToggleFollow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      isFollowing,
    }: {
      userId: string;
      isFollowing: boolean;
    }) => (isFollowing ? unfollowUser(userId) : followUser(userId)),
    onMutate: async ({ userId, isFollowing }) => {
      await queryClient.cancelQueries({ queryKey: ["publicProfile", userId] });
      await queryClient.cancelQueries({ queryKey: ["searchUsers"] });

      const previousProfile = queryClient.getQueryData<PublicProfile>([
        "publicProfile",
        userId,
      ]);

      queryClient.setQueryData<PublicProfile>(
        ["publicProfile", userId],
        (old: PublicProfile | undefined) =>
          old
            ? {
                ...old,
                isFollowedByViewer: !isFollowing,
                followerCount: old.followerCount + (isFollowing ? -1 : 1),
              }
            : old,
      );

      queryClient.setQueriesData<UserSearchResult[]>(
        { queryKey: ["searchUsers"] },
        (old: UserSearchResult[] | undefined) =>
          old?.map((user) =>
            user.id === userId
              ? { ...user, isFollowedByViewer: !isFollowing }
              : user,
          ),
      );

      return { previousProfile };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(
          ["publicProfile", userId],
          context.previousProfile,
        );
      }
      // Search results roll back via a plain refetch rather than a saved
      // snapshot — the mutation only patches whichever rows matched, so
      // there's no single "previous" list to restore across every cached
      // query key.
      queryClient.invalidateQueries({ queryKey: ["searchUsers"] });
    },
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
