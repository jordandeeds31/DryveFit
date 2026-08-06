import apiClient from "./client";
import {
  UserProfile,
  PublicProfile,
  PublicWorkoutLog,
} from "@/types/user.types";

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
): Promise<PublicWorkoutLog[]> => {
  const { data } = await apiClient.get(`/api/users/${userId}/workouts`);
  return data.result.workoutLogs;
};

export const updateProfile = async (
  input: Partial<
    Pick<UserProfile, "username" | "city" | "gender" | "isLeaderboardVisible">
  >,
): Promise<UserProfile> => {
  const { data } = await apiClient.patch("/api/users/me", input);
  return data.result.user;
};

export const uploadProfileImage = async (
  uri: string,
): Promise<UserProfile> => {
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
