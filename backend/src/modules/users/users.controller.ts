import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  getUserProfile,
  updateUserProfile,
  updatePushToken,
  clearPushToken,
  uploadProfileImage,
  deleteProfileImage,
  getProfileImage,
  getPublicProfile,
  searchUsers,
  deleteUserAccount,
} from "./users.service";
import { getPublicWorkoutHistory } from "../workoutLogs/workoutLogs.service";
import {
  getPublicActiveProgram,
  getPublicScheduleForUser,
} from "../programs/programs.service";
import { getPublicNutritionHistory } from "../nutrition/nutrition.service";
import { getPublicPostsByUser } from "../posts/posts.service";
import {
  followUser,
  unfollowUser,
  setNotifyOnNewPost,
  getFollowing,
} from "../follows/follows.service";

export const getMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = await getUserProfile(req.userId!);
    sendSuccess(res, 200, "USER_PROFILE_FETCHED", { user });
  },
);

export const updateMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { username, city, gender, isLeaderboardVisible, unitSystem } = req.body;
    const user = await updateUserProfile(req.userId!, {
      username,
      city,
      gender,
      isLeaderboardVisible,
      unitSystem,
    });
    sendSuccess(res, 200, "USER_PROFILE_UPDATED", { user });
  },
);

export const deleteMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await deleteUserAccount(req.userId!);
    sendSuccess(res, 200, "USER_DELETED", { message: "Account deleted" });
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

export const clearPushTokenHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await clearPushToken(req.userId!);
    sendSuccess(res, 200, "PUSH_TOKEN_CLEARED", { message: "Cleared" });
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

    const user = await getPublicProfile(req.userId!, userId);
    sendSuccess(res, 200, "PUBLIC_PROFILE_FETCHED", { user });
  },
);

export const getPublicWorkoutHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { month } = req.query;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const workoutLogs = await getPublicWorkoutHistory(
      req.userId!,
      userId,
      typeof month === "string" ? month : undefined,
    );
    sendSuccess(res, 200, "PUBLIC_WORKOUT_HISTORY_FETCHED", { workoutLogs });
  },
);

export const getPublicActiveProgramHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const program = await getPublicActiveProgram(req.userId!, userId);
    sendSuccess(res, 200, "PUBLIC_ACTIVE_PROGRAM_FETCHED", { program });
  },
);

export const getPublicScheduleHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const schedule = await getPublicScheduleForUser(req.userId!, userId);
    sendSuccess(res, 200, "PUBLIC_SCHEDULE_FETCHED", { schedule });
  },
);

export const getPublicNutritionHistoryHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { month } = req.query;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const days = await getPublicNutritionHistory(
      req.userId!,
      userId,
      typeof month === "string" ? month : undefined,
    );
    sendSuccess(res, 200, "PUBLIC_NUTRITION_HISTORY_FETCHED", { days });
  },
);

export const getPublicPostsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    const posts = await getPublicPostsByUser(req.userId!, userId);
    sendSuccess(res, 200, "PUBLIC_POSTS_FETCHED", { posts });
  },
);

export const searchUsersHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { query } = req.query;

    if (typeof query !== "string" || query.trim() === "") {
      throw new AppError(400, "query is required");
    }

    const users = await searchUsers(req.userId!, query);
    sendSuccess(res, 200, "USER_SEARCH_RESULTS", { users });
  },
);

export const followUserHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    await followUser(req.userId!, userId);
    sendSuccess(res, 200, "USER_FOLLOWED", { message: "Followed" });
  },
);

export const unfollowUserHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }

    await unfollowUser(req.userId!, userId);
    sendSuccess(res, 200, "USER_UNFOLLOWED", { message: "Unfollowed" });
  },
);

export const setNotifyOnNewPostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { enabled } = req.body;

    if (typeof userId !== "string") {
      throw new AppError(400, "userId is required");
    }
    if (typeof enabled !== "boolean") {
      throw new AppError(400, "enabled must be a boolean");
    }

    await setNotifyOnNewPost(req.userId!, userId, enabled);
    sendSuccess(res, 200, "FOLLOW_NOTIFY_UPDATED", { message: "Updated" });
  },
);

export const getFollowingHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const following = await getFollowing(req.userId!);
    sendSuccess(res, 200, "FOLLOWING_LIST", { following });
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
