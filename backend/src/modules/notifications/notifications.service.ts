import { Expo } from "expo-server-sdk";
import prisma from "../../lib/prisma";
import expo from "../../lib/expoPush";

const PAGE_SIZE = 30;

export type NotificationType =
  | "post_like"
  | "post_comment"
  | "comment_reply"
  | "follow";

const PUSH_TITLES: Record<NotificationType, (actorName: string) => string> = {
  post_like: (actorName) => `${actorName} liked your post`,
  post_comment: (actorName) => `${actorName} commented on your post`,
  comment_reply: (actorName) => `${actorName} replied to your comment`,
  follow: (actorName) => `${actorName} started following you`,
};

interface CreateNotificationInput {
  userId: string;
  actorId: string;
  type: NotificationType;
  postId?: string;
  commentId?: string;
  // Shown as the push notification's body — the liked post's caption, or
  // the comment's own text. Left out (title-only push) when there's
  // nothing meaningful to preview.
  previewText?: string | null;
}

export const createNotification = async ({
  userId,
  actorId,
  type,
  postId,
  commentId,
  previewText,
}: CreateNotificationInput) => {
  // Nobody needs to be told they liked/commented on their own post.
  if (userId === actorId) return;

  const [, recipient, actor] = await Promise.all([
    prisma.notification.create({
      data: { userId, actorId, type, postId, commentId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    }),
    prisma.user.findUnique({
      where: { id: actorId },
      select: { username: true, email: true },
    }),
  ]);

  if (!recipient?.expoPushToken || !Expo.isExpoPushToken(recipient.expoPushToken)) {
    return;
  }

  const actorName = actor?.username ?? actor?.email ?? "Someone";

  // A failed push (bad/expired token, Expo hiccup, ...) is never worth
  // failing the like/comment request over — the in-app notification row
  // above already succeeded and is the source of truth either way.
  try {
    await expo.sendPushNotificationsAsync([
      {
        to: recipient.expoPushToken,
        sound: "default",
        title: PUSH_TITLES[type](actorName),
        body: previewText ?? undefined,
        data: { type, postId, commentId, actorId },
      },
    ]);
  } catch (err) {
    console.warn(`Failed to send ${type} push notification:`, err);
  }
};

const actorSelect = {
  id: true,
  username: true,
  email: true,
  profileImageMimeType: true,
} as const;

type Actor = {
  id: string;
  username: string | null;
  email: string;
  profileImageMimeType: string | null;
};

const postPreviewSelect = {
  id: true,
  caption: true,
  mediaUrl: true,
  mediaType: true,
} as const;

type PostPreview = {
  id: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
};

const toNotificationResponse = (notification: {
  id: string;
  type: string;
  postId: string | null;
  commentId: string | null;
  isRead: boolean;
  createdAt: Date;
  actor: Actor;
  post: PostPreview | null;
}) => ({
  id: notification.id,
  type: notification.type,
  commentId: notification.commentId,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
  actor: {
    id: notification.actor.id,
    // A liker/commenter who hasn't picked a username yet shouldn't be an
    // anonymous notification — falling back to their email keeps it
    // identifiable.
    displayName: notification.actor.username ?? notification.actor.email,
    profileImageUrl: notification.actor.profileImageMimeType
      ? `/api/users/${notification.actor.id}/profile-image`
      : null,
  },
  // Cascade-deleted alongside the notification if the post itself is
  // deleted (see schema), so this is only ever null for a notification
  // type that never had a post to begin with — not today, but the field
  // stays nullable for that future case.
  post: notification.post,
});

export const getNotifications = async (userId: string, cursor?: string) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      postId: true,
      commentId: true,
      isRead: true,
      createdAt: true,
      actor: { select: actorSelect },
      post: { select: postPreviewSelect },
    },
  });

  const hasMore = notifications.length > PAGE_SIZE;
  const page = hasMore ? notifications.slice(0, PAGE_SIZE) : notifications;

  return {
    notifications: page.map(toNotificationResponse),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
};

export const getUnreadCount = async (userId: string) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { count };
};

export const markAllNotificationsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};
