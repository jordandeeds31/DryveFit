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
  getFollowing,
  setNotifyOnNewPost,
} from "@/lib/api/users.api";
import { PublicProfile, UserSearchResult, FollowedUser } from "@/types/user.types";

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

export const usePublicWorkoutHistory = (
  userId: string | null,
  monthKey?: string,
) => {
  return useQuery({
    queryKey: ["publicWorkoutHistory", userId, monthKey ?? "current"],
    queryFn: () => getPublicWorkoutHistory(userId!, monthKey),
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
                // Unfollowing deletes the Follow row entirely, taking its
                // notify flag with it; a fresh follow always starts off.
                notifyOnNewPost: false,
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

// The "people I follow" notify-toggle management screen — separate from
// usePublicProfile/useSearchUsers since neither of those lists everyone a
// user follows, only one profile or search-matched profiles at a time.
export const useFollowing = () => {
  return useQuery({
    queryKey: ["following"],
    queryFn: getFollowing,
  });
};

// No optimistic update here (unlike useToggleFollow) — whether a 6th toggle
// is allowed depends on server-side state (the other 5 rows) that this
// client doesn't fully mirror, so this waits for the real success/failure
// rather than guessing and rolling back.
export const useSetNotifyOnNewPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      setNotifyOnNewPost(userId, enabled),
    onSuccess: (_data, { userId, enabled }) => {
      queryClient.setQueryData<PublicProfile>(
        ["publicProfile", userId],
        (old: PublicProfile | undefined) =>
          old ? { ...old, notifyOnNewPost: enabled } : old,
      );
      queryClient.setQueryData<FollowedUser[]>(
        ["following"],
        (old: FollowedUser[] | undefined) =>
          old?.map((user) =>
            user.id === userId ? { ...user, notifyOnNewPost: enabled } : user,
          ),
      );
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
      // Editing happens from the profile screen (EditProfileModal), which
      // reads its display data from usePublicProfile, not useCurrentUser —
      // without this, your own profile screen would keep showing the old
      // username/city until some unrelated refetch happened to run.
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
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
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
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
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
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
