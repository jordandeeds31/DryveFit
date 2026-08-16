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
