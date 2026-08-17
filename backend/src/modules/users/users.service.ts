import sharp from "sharp";
import prisma from "../../lib/prisma";
import cloudinary from "../../lib/cloudinary";
import AppError from "../../utils/AppError";
import { isValidCity } from "../../constants/cities";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// Kept deliberately narrow to exactly what the leaderboard's Men/Women
// split needs — not a general identity field elsewhere in the app.
const VALID_GENDERS = ["male", "female"] as const;

const PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  city: true,
  gender: true,
  isLeaderboardVisible: true,
  profileImageMimeType: true,
  unitSystem: true,
  createdAt: true,
} as const;

type RawProfile = {
  id: string;
  email: string;
  username: string | null;
  city: string | null;
  gender: string | null;
  isLeaderboardVisible: boolean;
  profileImageMimeType: string | null;
  unitSystem: string | null;
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

// Deliberately excludes email (and anything else PROFILE_SELECT/
// toProfileResponse would include) — this is shown to OTHER users, not the
// account owner, unlike getUserProfile above.
export const getPublicProfile = async (
  viewerId: string,
  targetUserId: string,
) => {
  const user = await prisma.user.findFirst({
    // Same eligibility gate as the leaderboard query — appearing there is
    // the only thing that makes a profile viewable by other users.
    where: {
      id: targetUserId,
      isLeaderboardVisible: true,
      username: { not: null },
    },
    select: {
      id: true,
      username: true,
      profileImageMimeType: true,
      _count: { select: { followers: true, following: true } },
      // At most one row: whether the viewer already follows this profile.
      followers: { where: { followerId: viewerId }, select: { id: true } },
    },
  });

  if (!user) {
    throw new AppError(404, "Profile not found");
  }

  return {
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageMimeType
      ? `/api/users/${user.id}/profile-image`
      : null,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    isFollowedByViewer: user.followers.length > 0,
  };
};

const SEARCH_RESULTS_LIMIT = 20;

// Same eligibility gate as getPublicProfile — a user can only be found
// (and therefore followed) through this search if their profile would
// actually be viewable, keeping "discoverable" and "viewable" in sync
// rather than opening a second, looser way to look someone up by email.
export const searchUsers = async (viewerId: string, query: string) => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      isLeaderboardVisible: true,
      username: { not: null },
      OR: [
        { username: { contains: trimmed, mode: "insensitive" } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      profileImageMimeType: true,
      followers: { where: { followerId: viewerId }, select: { id: true } },
    },
    take: SEARCH_RESULTS_LIMIT,
  });

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    profileImageUrl: user.profileImageMimeType
      ? `/api/users/${user.id}/profile-image`
      : null,
    isFollowedByViewer: user.followers.length > 0,
  }));
};

const VALID_UNIT_SYSTEMS = ["metric", "imperial"] as const;

interface UpdateProfileInput {
  username?: string;
  city?: string;
  gender?: string;
  isLeaderboardVisible?: boolean;
  unitSystem?: string;
}

export const updateUserProfile = async (
  userId: string,
  { username, city, gender, isLeaderboardVisible, unitSystem }: UpdateProfileInput,
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

  if (
    gender !== undefined &&
    !VALID_GENDERS.includes(gender as (typeof VALID_GENDERS)[number])
  ) {
    throw new AppError(400, "Invalid gender");
  }

  if (
    unitSystem !== undefined &&
    !VALID_UNIT_SYSTEMS.includes(unitSystem as (typeof VALID_UNIT_SYSTEMS)[number])
  ) {
    throw new AppError(400, "Invalid unitSystem");
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { username, city, gender, isLeaderboardVisible, unitSystem },
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

// Called on app launch once notification permission is granted — re-sent
// every time so a reinstalled app or a token Expo rotates behind the
// scenes stays current, and so the timezone updates if the user travels.
export const updatePushToken = async (
  userId: string,
  { expoPushToken, timezone }: { expoPushToken: string; timezone: string },
) => {
  // A device's Expo push token is stable across whoever's logged into it,
  // but only one account should ever be able to receive pushes on it at
  // once — without this, switching accounts on the same device (or
  // logging out without a clean unregister) leaves the token attached to
  // the PREVIOUS account, which then keeps getting its pushes delivered
  // to whoever's holding the device now. Reassigning it here — strip it
  // from wherever it currently lives, then give it to this user — keeps
  // that 1:1 invariant self-healing on every fresh registration.
  await prisma.user.updateMany({
    where: { expoPushToken, id: { not: userId } },
    data: { expoPushToken: null },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken, timezone },
  });
};

// Called on logout — an immediate cleanup on top of updatePushToken's
// self-healing reassignment, so a signed-out account stops being able to
// receive pushes on this device right away instead of only once someone
// else happens to log in and reclaim the token.
export const clearPushToken = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: null },
  });
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

// Every other User-owned table (programs, workout logs, posts, cardio
// sessions, chat, food log, trainer, likes/comments) cascades on
// prisma.user.delete via its own onDelete: Cascade FK — the only thing
// that DOESN'T cascade is the actual Cloudinary-hosted media behind each
// post (profile images are stored as DB bytes, so those go with the row).
// Cleaned up best-effort, same as deletePost — an orphaned Cloudinary
// asset is recoverable manually, a half-deleted account isn't.
export const deleteUserAccount = async (userId: string) => {
  const posts = await prisma.post.findMany({
    where: { userId, mediaPublicId: { not: null } },
    select: { mediaPublicId: true, mediaType: true },
  });

  await prisma.user.delete({ where: { id: userId } });

  for (const post of posts) {
    cloudinary.uploader
      .destroy(post.mediaPublicId!, {
        resource_type: post.mediaType === "video" ? "video" : "image",
      })
      .catch((err) => {
        console.warn(
          `Failed to delete Cloudinary asset ${post.mediaPublicId}:`,
          err,
        );
      });
  }
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
