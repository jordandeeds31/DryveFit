import sharp from "sharp";
import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import { isValidCity } from "../../constants/cities";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  city: true,
  isLeaderboardVisible: true,
  profileImageMimeType: true,
  createdAt: true,
} as const;

type RawProfile = {
  id: string;
  email: string;
  username: string | null;
  city: string | null;
  isLeaderboardVisible: boolean;
  profileImageMimeType: string | null;
  createdAt: Date;
};

// Never includes the actual image bytes — only whether one exists, so the
// profile payload stays small. The real bytes are fetched separately via
// GET /api/users/:userId/profile-image.
const toProfileResponse = (user: RawProfile) => {
  const { profileImageMimeType, ...rest } = user;
  return {
    ...rest,
    profileImageUrl: profileImageMimeType
      ? `/api/users/${user.id}/profile-image`
      : null,
  };
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: PROFILE_SELECT,
  });
  return toProfileResponse(user);
};

interface UpdateProfileInput {
  username?: string;
  city?: string;
  isLeaderboardVisible?: boolean;
}

export const updateUserProfile = async (
  userId: string,
  { username, city, isLeaderboardVisible }: UpdateProfileInput,
) => {
  if (username !== undefined && !USERNAME_REGEX.test(username)) {
    throw new AppError(
      400,
      "Username must be 3-20 characters, letters, numbers, and underscores only",
    );
  }

  if (city !== undefined && !isValidCity(city)) {
    throw new AppError(400, "Invalid city");
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username, city, isLeaderboardVisible },
      select: PROFILE_SELECT,
    });
    return toProfileResponse(user);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new AppError(409, "That username is already taken");
    }
    throw err;
  }
};

export const uploadProfileImage = async (userId: string, buffer: Buffer) => {
  // Normalize every upload to the same small, predictable size/format
  // regardless of what the user picked — keeps stored rows tiny.
  const processed = await sharp(buffer)
    .resize(300, 300, { fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: processed, profileImageMimeType: "image/jpeg" },
    select: PROFILE_SELECT,
  });

  return toProfileResponse(user);
};

export const deleteProfileImage = async (userId: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: null, profileImageMimeType: null },
    select: PROFILE_SELECT,
  });

  return toProfileResponse(user);
};

export const getProfileImage = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileImage: true, profileImageMimeType: true },
  });

  if (!user?.profileImage || !user.profileImageMimeType) return null;

  // The driver adapter can hand back Bytes as a plain Uint8Array rather
  // than a Buffer — coerce explicitly so res.send() handles it correctly.
  return {
    buffer: Buffer.from(user.profileImage),
    contentType: user.profileImageMimeType,
  };
};
