import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  getUserProfile,
  updateUserProfile,
  updatePushToken,
  uploadProfileImage,
  deleteProfileImage,
  getProfileImage,
  getPublicProfile,
} from "./users.service";
import { getPublicWorkoutHistory } from "../workoutLogs/workoutLogs.service";

export const getMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = await getUserProfile(req.userId!);
    sendSuccess(res, 200, "USER_PROFILE_FETCHED", { user });
  },
);

export const updateMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { username, city, gender, isLeaderboardVisible } = req.body;
    const user = await updateUserProfile(req.userId!, {
      username,
      city,
      gender,
      isLeaderboardVisible,
    });
    sendSuccess(res, 200, "USER_PROFILE_UPDATED", { user });
  },
);

export const updatePushTokenHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { expoPushToken, timezone } = req.body;

    if (typeof expoPushToken !== "string" || expoPushToken.trim() === "") {
      throw new AppError(400, "expoPushToken is required");
    }
    if (typeof timezone !== "string" || timezone.trim() === "") {
      throw new AppError(400, "timezone is required");
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      throw new AppError(400, "Invalid timezone");
    }

    await updatePushToken(req.userId!, { expoPushToken, timezone });
    sendSuccess(res, 200, "PUSH_TOKEN_UPDATED", { message: "Saved" });
  },
);

export const uploadProfileImageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const file = req.file;

    if (!file) {
      throw new AppError(400, "image file is required");
    }
    if (!file.mimetype.startsWith("image/")) {
      throw new AppError(400, "File must be an image");
    }

    const user = await uploadProfileImage(req.userId!, file.buffer);
    sendSuccess(res, 200, "PROFILE_IMAGE_UPLOADED", { user });
  },
);

export const deleteProfileImageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = await deleteProfileImage(req.userId!);
    sendSuccess(res, 200, "PROFILE_IMAGE_DELETED", { user });
  },
);

export const getPublicProfileHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const user = await getPublicProfile(userId);
    sendSuccess(res, 200, "PUBLIC_PROFILE_FETCHED", { user });
  },
);

export const getPublicWorkoutHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const workoutLogs = await getPublicWorkoutHistory(userId);
    sendSuccess(res, 200, "PUBLIC_WORKOUT_HISTORY_FETCHED", { workoutLogs });
  },
);

export const getProfileImageHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const image = await getProfileImage(userId);

    if (!image) {
      throw new AppError(404, "Profile image not found");
    }

    res.setHeader("Content-Type", image.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(image.buffer);
  },
);
