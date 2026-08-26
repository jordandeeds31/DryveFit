import { Readable } from "stream";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import prisma from "../../lib/prisma";
import cloudinary from "../../lib/cloudinary";
import expo from "../../lib/expoPush";
import { Expo } from "expo-server-sdk";
import AppError from "../../utils/AppError";
import { broadcastToUser, isUserConnected } from "../../ws/registry";

const MESSAGES_PAGE_SIZE = 30;

// Same Cloudinary-stream-upload approach as posts.service.ts's
// uploadPostMedia — image-only here, no video, since a DM attachment is a
// quick photo, not a media post.
const uploadDmImage = (
  buffer: Buffer,
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "dm-messages",
        resource_type: "image",
        transformation: [
          { width: 1080, height: 1080, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });

// Self-DM guard mirrors followUser's self-follow guard (follows.service.ts).
// DM access is intentionally open (any authenticated user can message any
// other — matches this app's open, one-directional Follow model), so
// there's no discoverability/eligibility gate here beyond "the target
// account exists."
export const findOrCreateOneOnOneConversation = async (
  userAId: string,
  userBId: string,
) => {
  if (userAId === userBId) {
    throw new AppError(400, "You can't message yourself");
  }

  const target = await prisma.user.findUnique({
    where: { id: userBId },
    select: { id: true },
  });
  if (!target) {
    throw new AppError(404, "User not found");
  }

  return prisma.$transaction(async (tx) => {
    // Serializes concurrent attempts to start a conversation between this
    // exact pair (e.g. both users tapping "Message" on each other's
    // profile at the same moment) — without this, two simultaneous
    // find-then-create calls can both see "no existing conversation" and
    // both insert one, since a join-table design (unlike Follow's fixed
    // two-column @@unique) has no DB-level constraint preventing a
    // duplicate 1:1 pair. Sorted so the lock key is the same regardless of
    // call order (A messaging B takes the same lock as B messaging A).
    const [lockA, lockB] =
      userAId < userBId ? [userAId, userBId] : [userBId, userAId];
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockA}), hashtext(${lockB}))`;

    const existing = await tx.dmConversation.findFirst({
      where: {
        participants: { some: { userId: userAId } },
        AND: { participants: { some: { userId: userBId } } },
      },
      include: { participants: true },
    });

    // Guards against a hypothetical future group conversation that happens
    // to include both of these two users among others — only an exact
    // 2-participant match counts as "the" 1:1 conversation between them.
    if (existing && existing.participants.length === 2) {
      return existing;
    }

    return tx.dmConversation.create({
      data: {
        participants: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      include: { participants: true },
    });
  });
};

const requireParticipant = async (userId: string, conversationId: string) => {
  const participant = await prisma.dmParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  // 404, not 403 — matches getPublicProfile's "don't confirm existence to
  // someone who isn't allowed to see it" pattern, though here it's really
  // just "you were never in this conversation."
  if (!participant) {
    throw new AppError(404, "Conversation not found");
  }
  return participant;
};

export const listDmConversations = async (userId: string) => {
  const participations = await prisma.dmParticipant.findMany({
    where: { userId },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          updatedAt: true,
          participants: {
            where: { userId: { not: userId } },
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profileImageMimeType: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              imageUrl: true,
              createdAt: true,
              senderId: true,
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  // Per-conversation, not a single groupBy — the unread cutoff
  // (lastReadAt) is different for each conversation, so it can't be
  // expressed as one shared WHERE clause across all of them at once.
  const unreadByConversation = new Map<string, number>();
  for (const p of participations) {
    const count = await prisma.dmMessage.count({
      where: {
        conversationId: p.conversation.id,
        senderId: { not: userId },
        ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
      },
    });
    unreadByConversation.set(p.conversation.id, count);
  }

  return participations.map((p) => {
    const otherParticipant = p.conversation.participants[0]?.user ?? null;
    const lastMessage = p.conversation.messages[0] ?? null;

    return {
      id: p.conversation.id,
      updatedAt: p.conversation.updatedAt,
      otherUser: otherParticipant
        ? {
            id: otherParticipant.id,
            username: otherParticipant.username,
            profileImageUrl: otherParticipant.profileImageMimeType
              ? `/api/users/${otherParticipant.id}/profile-image`
              : null,
          }
        : null,
      lastMessage: lastMessage
        ? {
            // No text content on an image-only message — same "📷 Photo"
            // stand-in used for its push notification body.
            content: lastMessage.content ?? "📷 Photo",
            createdAt: lastMessage.createdAt,
            isOwnMessage: lastMessage.senderId === userId,
          }
        : null,
      unreadCount: unreadByConversation.get(p.conversation.id) ?? 0,
    };
  });
};

export const getDmMessages = async (
  userId: string,
  conversationId: string,
  cursor?: string,
) => {
  await requireParticipant(userId, conversationId);

  const messages = await prisma.dmMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: MESSAGES_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > MESSAGES_PAGE_SIZE;
  const page = hasMore ? messages.slice(0, MESSAGES_PAGE_SIZE) : messages;

  return {
    messages: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
};

export const sendDmMessage = async (
  senderId: string,
  conversationId: string,
  content: string,
  imageBuffer?: Buffer | null,
) => {
  const trimmed = content.trim();
  if (!trimmed && !imageBuffer) {
    throw new AppError(400, "Message can't be empty");
  }

  await requireParticipant(senderId, conversationId);

  let imageUrl: string | null = null;
  let imagePublicId: string | null = null;

  if (imageBuffer) {
    try {
      const uploaded = await uploadDmImage(imageBuffer);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
    } catch (err) {
      console.error("Cloudinary DM image upload failed:", err);
      throw new AppError(502, "Couldn't upload the image — try again");
    }
  }

  const [message] = await prisma.$transaction([
    prisma.dmMessage.create({
      data: {
        conversationId,
        senderId,
        content: trimmed || null,
        imageUrl,
        imagePublicId,
      },
    }),
    prisma.dmConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  const otherParticipants = await prisma.dmParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
    select: { userId: true },
  });

  const payload = {
    type: "message:new" as const,
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt.toISOString(),
    },
  };

  for (const { userId: recipientId } of otherParticipants) {
    broadcastToUser(recipientId, payload);

    // Only push if the recipient has no live socket at all — one with the
    // app open (on any screen) already gets this instantly via the
    // broadcast above, and the push notification handler shows a banner
    // even while foregrounded (see pushNotifications.ts's
    // shouldShowAlert: true), so pushing regardless would double them up.
    if (isUserConnected(recipientId)) continue;

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { expoPushToken: true },
    });
    if (!recipient?.expoPushToken || !Expo.isExpoPushToken(recipient.expoPushToken)) {
      continue;
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true, email: true },
    });

    // Never fails the send over a bad/expired push token or an Expo
    // hiccup — same swallow-and-log behavior as createNotification.
    try {
      await expo.sendPushNotificationsAsync([
        {
          to: recipient.expoPushToken,
          sound: "default",
          title: sender?.username ?? sender?.email ?? "New message",
          body: trimmed || "📷 Photo",
          data: { type: "dm_message", conversationId },
        },
      ]);
    } catch (err) {
      console.warn("Failed to send DM push notification:", err);
    }
  }

  return message;
};

export const markDmConversationRead = async (
  userId: string,
  conversationId: string,
) => {
  await requireParticipant(userId, conversationId);

  const latestMessage = await prisma.dmMessage.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const now = new Date();
  await prisma.dmParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: {
      lastReadMessageId: latestMessage?.id ?? null,
      lastReadAt: now,
    },
  });

  if (!latestMessage) return;

  const otherParticipants = await prisma.dmParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    select: { userId: true },
  });

  for (const { userId: otherId } of otherParticipants) {
    broadcastToUser(otherId, {
      type: "read:receipt",
      conversationId,
      userId,
      lastReadMessageId: latestMessage.id,
      lastReadAt: now.toISOString(),
    });
  }
};
