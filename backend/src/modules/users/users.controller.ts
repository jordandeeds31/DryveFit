import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  deleteProfileImage,
  getProfileImage,
} from "./users.service";

export const getMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const user = await getUserProfile(req.userId!);
    sendSuccess(res, 200, "USER_PROFILE_FETCHED", { user });
  },
);

export const updateMeHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { username, city, isLeaderboardVisible } = req.body;
    const user = await updateUserProfile(req.userId!, {
      username,
      city,
      isLeaderboardVisible,
    });
    sendSuccess(res, 200, "USER_PROFILE_UPDATED", { user });
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
