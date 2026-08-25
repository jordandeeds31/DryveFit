import apiClient from "./client";
import {
  UserProfile,
  PublicProfile,
  PublicWorkoutLog,
  PublicNutritionDay,
  UserSearchResult,
} from "@/types/user.types";
import { ProgramWithWeeks } from "@/types/programs.types";
import { Post } from "@/types/posts.types";

export const getCurrentUser = async (): Promise<UserProfile> => {
  const { data } = await apiClient.get("/api/users/me");
  return data.result.user;
};

export const getPublicProfile = async (
  userId: string,
): Promise<PublicProfile> => {
  const { data } = await apiClient.get(`/api/users/${userId}/public-profile`);
  return data.result.user;
};

export const getPublicWorkoutHistory = async (
  userId: string,
  // "YYYY-MM" — defaults server-side to the current month when omitted.
  monthKey?: string,
): Promise<PublicWorkoutLog[]> => {
  const { data } = await apiClient.get(`/api/users/${userId}/workouts`, {
    params: monthKey ? { month: monthKey } : undefined,
  });
  return data.result.workoutLogs;
};

export const getPublicActiveProgram = async (
  userId: string,
): Promise<ProgramWithWeeks | null> => {
  const { data } = await apiClient.get(`/api/users/${userId}/active-program`);
  return data.result.program;
};

export const getPublicNutritionHistory = async (
  userId: string,
  // "YYYY-MM" — defaults server-side to the current month when omitted.
  monthKey?: string,
): Promise<PublicNutritionDay[]> => {
  const { data } = await apiClient.get(`/api/users/${userId}/nutrition`, {
    params: monthKey ? { month: monthKey } : undefined,
  });
  return data.result.days;
};

export const getPublicPosts = async (userId: string): Promise<Post[]> => {
  const { data } = await apiClient.get(`/api/users/${userId}/posts`);
  return data.result.posts;
};

export const searchUsers = async (
  query: string,
): Promise<UserSearchResult[]> => {
  const { data } = await apiClient.get("/api/users/search", {
    params: { query },
  });
  return data.result.users;
};

export const followUser = async (userId: string): Promise<void> => {
  await apiClient.post(`/api/users/${userId}/follow`);
};

export const unfollowUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/api/users/${userId}/follow`);
};

export const updateProfile = async (
  input: Partial<
    Pick<
      UserProfile,
      "username" | "city" | "gender" | "isLeaderboardVisible" | "unitSystem"
    >
  >,
): Promise<UserProfile> => {
  const { data } = await apiClient.patch("/api/users/me", input);
  return data.result.user;
};

export const updatePushToken = async (input: {
  expoPushToken: string;
  timezone: string;
}): Promise<void> => {
  await apiClient.patch("/api/users/me/push-token", input);
};

export const clearPushToken = async (): Promise<void> => {
  await apiClient.delete("/api/users/me/push-token");
};

export const uploadProfileImage = async (uri: string): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append("image", {
    uri,
    name: "profile.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const { data } = await apiClient.post(
    "/api/users/me/profile-image",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.result.user;
};

export const deleteProfileImage = async (): Promise<UserProfile> => {
  const { data } = await apiClient.delete("/api/users/me/profile-image");
  return data.result.user;
};

export const deleteAccount = async (): Promise<void> => {
  await apiClient.delete("/api/users/me");
};
