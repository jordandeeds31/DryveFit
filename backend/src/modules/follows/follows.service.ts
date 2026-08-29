import prisma from "../../lib/prisma";
import AppError from "../../utils/AppError";
import { createNotification } from "../notifications/notifications.service";

export const followUser = async (followerId: string, followingId: string) => {
  if (followerId === followingId) {
    throw new AppError(400, "You can't follow yourself");
  }

  // Same eligibility gate as getPublicProfile — only a profile that's
  // actually viewable is followable, keeping "who can find/follow me" in
  // step with "who can view my profile" rather than opening a second,
  // inconsistent way to look someone up.
  const target = await prisma.user.findFirst({
    where: {
      id: followingId,
      isLeaderboardVisible: true,
      username: { not: null },
    },
    select: { id: true },
  });

  if (!target) {
    throw new AppError(404, "Profile not found");
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });

  // Idempotent — following twice succeeds silently rather than erroring
  // on the unique constraint, and skips a duplicate notification.
  if (existing) return;

  await prisma.follow.create({ data: { followerId, followingId } });

  await createNotification({
    userId: followingId,
    actorId: followerId,
    type: "follow",
  });
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  await prisma.follow.deleteMany({ where: { followerId, followingId } });
};

// A hard product cap, not a performance one — this app has no feed-fan-out
// concerns at its current scale, but an unbounded "notify me" list would
// turn into every follow being noisy again, defeating the point of an
// opt-in toggle at all.
export const MAX_NOTIFY_ON_NEW_POST = 5;

export const setNotifyOnNewPost = async (
  followerId: string,
  followingId: string,
  enabled: boolean,
) => {
  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true, notifyOnNewPost: true },
  });

  if (!follow) {
    throw new AppError(400, "You have to follow someone before you can turn on notifications for them");
  }

  if (enabled && !follow.notifyOnNewPost) {
    const activeCount = await prisma.follow.count({
      where: { followerId, notifyOnNewPost: true },
    });
    if (activeCount >= MAX_NOTIFY_ON_NEW_POST) {
      throw new AppError(
        400,
        `You can only turn on notifications for ${MAX_NOTIFY_ON_NEW_POST} people at once — turn one off first`,
      );
    }
  }

  await prisma.follow.update({
    where: { id: follow.id },
    data: { notifyOnNewPost: enabled },
  });
};

// Backs a "people you follow" management screen — every followed user, in
// follow order, with enough to render a row and drive the notify toggle.
export const getFollowing = async (followerId: string) => {
  const follows = await prisma.follow.findMany({
    where: { followerId },
    orderBy: { createdAt: "asc" },
    select: {
      notifyOnNewPost: true,
      following: {
        select: { id: true, username: true, profileImageMimeType: true },
      },
    },
  });

  return follows.map(({ following, notifyOnNewPost }) => ({
    id: following.id,
    username: following.username,
    profileImageUrl: following.profileImageMimeType
      ? `/api/users/${following.id}/profile-image`
      : null,
    notifyOnNewPost,
  }));
};
