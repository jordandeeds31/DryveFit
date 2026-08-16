import { Readable } from "stream";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";
import prisma from "../../lib/prisma";
import cloudinary from "../../lib/cloudinary";
import AppError from "../../utils/AppError";
import { createNotification } from "../notifications/notifications.service";

const FEED_PAGE_SIZE = 20;

// Needs viewerId at call time — "did THIS viewer like it" can't be baked
// into a static select, so this is a function instead of a constant.
const getPostSelect = (viewerId: string) =>
  ({
    id: true,
    caption: true,
    mediaUrl: true,
    mediaType: true,
    createdAt: true,
    userId: true,
    user: {
      select: {
        id: true,
        username: true,
        profileImageMimeType: true,
      },
    },
    _count: { select: { likes: true, comments: true } },
    // At most one row: whether the viewer has a like on this post at all.
    likes: { where: { userId: viewerId }, select: { id: true } },
  }) as const;

type PostWithAuthor = {
  id: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    username: string | null;
    profileImageMimeType: string | null;
  };
  _count: { likes: number; comments: number };
  likes: { id: string }[];
};

const toPostResponse = (post: PostWithAuthor, viewerId: string) => ({
  id: post.id,
  caption: post.caption,
  // Already a full, publicly-servable Cloudinary URL — not routed through
  // our own API like profile pictures/exercise GIFs are, so no path to
  // prefix with our own base URL here.
  mediaUrl: post.mediaUrl,
  mediaType: post.mediaType as "image" | "video" | null,
  createdAt: post.createdAt,
  isOwnPost: post.userId === viewerId,
  likeCount: post._count.likes,
  commentCount: post._count.comments,
  isLikedByViewer: post.likes.length > 0,
  author: {
    id: post.user.id,
    username: post.user.username,
    profileImageUrl: post.user.profileImageMimeType
      ? `/api/users/${post.user.id}/profile-image`
      : null,
  },
});

// Cloudinary's SDK takes a stream or file path, not a raw Buffer directly —
// wrapping the multer-provided buffer in a Readable is the standard way to
// feed it in without writing a temp file to disk first. Returns public_id
// alongside the URL so the asset can actually be deleted from Cloudinary
// later (see deletePost) — the URL alone isn't enough to do that.
const uploadPostMedia = (
  buffer: Buffer,
  mediaType: "image" | "video",
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "posts",
        resource_type: mediaType,
        // Cap dimensions and let Cloudinary pick the best format/quality
        // per-viewer at delivery time, rather than us pre-compressing
        // before upload — this is the point of using Cloudinary. Video
        // only needs a width cap (short-form content, no reason to keep
        // 4K source files around); images keep the square-ish cap since
        // feed image cards are roughly square.
        transformation:
          mediaType === "video"
            ? [{ width: 720, crop: "limit" }, { quality: "auto" }]
            : [
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

interface CreatePostInput {
  userId: string;
  caption: string | null;
  mediaBuffer: Buffer | null;
  // Only meaningful when mediaBuffer is set — which Cloudinary
  // resource_type to upload as.
  mediaType: "image" | "video" | null;
}

export const createPost = async ({
  userId,
  caption,
  mediaBuffer,
  mediaType,
}: CreatePostInput) => {
  const trimmedCaption = caption?.trim() || null;

  if (!trimmedCaption && !mediaBuffer) {
    throw new AppError(400, "A post needs a caption, media, or both");
  }

  let mediaUrl: string | null = null;
  let mediaPublicId: string | null = null;

  if (mediaBuffer && mediaType) {
    try {
      const uploaded = await uploadPostMedia(mediaBuffer, mediaType);
      mediaUrl = uploaded.url;
      mediaPublicId = uploaded.publicId;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      throw new AppError(502, "Couldn't upload the media — try again");
    }
  }

  const post = await prisma.post.create({
    data: {
      userId,
      caption: trimmedCaption,
      mediaUrl,
      mediaType: mediaUrl ? mediaType : null,
      mediaPublicId,
    },
    select: getPostSelect(userId),
  });

  return toPostResponse(post, userId);
};

// Backs the standalone post detail screen (reached by tapping a post's
// image/caption, as opposed to tapping the author's name, which goes to
// their profile instead) — no extra visibility gating beyond auth, same
// as the feed itself already has none.
export const getPostById = async (viewerId: string, postId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: getPostSelect(viewerId),
  });

  if (!post) {
    throw new AppError(404, "Post not found");
  }

  return toPostResponse(post, viewerId);
};

export const getFeed = async (viewerId: string, cursor?: string) => {
  const posts = await prisma.post.findMany({
    select: getPostSelect(viewerId),
    orderBy: { createdAt: "desc" },
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const page = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  return {
    posts: page.map((post) => toPostResponse(post, viewerId)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
};

const PUBLIC_POSTS_LIMIT = 20;

// Shown on another user's public profile's Social tab — gated by the same
// isLeaderboardVisible/username eligibility as getPublicProfile. Uses
// viewerId (not targetUserId) for getPostSelect/toPostResponse so
// isLikedByViewer/isOwnPost reflect whoever is looking, same as the main
// feed — not whether the profile owner liked their own posts.
export const getPublicPostsByUser = async (
  viewerId: string,
  targetUserId: string,
) => {
  const user = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      isLeaderboardVisible: true,
      username: { not: null },
    },
    select: { id: true },
  });

  if (!user) {
    throw new AppError(404, "Profile not found");
  }

  const posts = await prisma.post.findMany({
    where: { userId: targetUserId },
    select: getPostSelect(viewerId),
    orderBy: { createdAt: "desc" },
    take: PUBLIC_POSTS_LIMIT,
  });

  return posts.map((post) => toPostResponse(post, viewerId));
};

export const deletePost = async (userId: string, postId: string) => {
  const post = await prisma.post.findFirst({
    where: { id: postId, userId },
    select: { id: true, mediaPublicId: true, mediaType: true },
  });

  if (!post) {
    throw new AppError(404, "Post not found");
  }

  await prisma.post.delete({ where: { id: postId } });

  if (post.mediaPublicId) {
    // Best-effort — the DB row is already gone (that's what the user
    // actually sees), so a Cloudinary hiccup here shouldn't surface as a
    // failed delete. Worst case an orphaned asset sits in storage; that's
    // recoverable manually, an inconsistent "delete failed" isn't.
    // resource_type must match what it was uploaded as — Cloudinary's
    // destroy defaults to "image" and silently won't find a video asset
    // otherwise.
    cloudinary.uploader
      .destroy(post.mediaPublicId, {
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

export const likePost = async (userId: string, postId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!post) {
    throw new AppError(404, "Post not found");
  }

  // Checked separately (rather than relying on upsert's create/update
  // branches) so a genuinely new like — and only a genuinely new one —
  // triggers a notification below; re-liking an already-liked post stays
  // idempotent and silent, same as before.
  const existingLike = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true },
  });

  if (existingLike) return;

  await prisma.postLike.create({ data: { postId, userId } });

  await createNotification({
    userId: post.userId,
    actorId: userId,
    type: "post_like",
    postId,
  });
};

export const unlikePost = async (userId: string, postId: string) => {
  await prisma.postLike.deleteMany({ where: { postId, userId } });
};

// Needs viewerId at call time, same reason as getPostSelect above.
const getCommentSelect = (viewerId: string) =>
  ({
    id: true,
    content: true,
    createdAt: true,
    userId: true,
    parentId: true,
    user: {
      select: { id: true, username: true, profileImageMimeType: true },
    },
    _count: { select: { likes: true } },
    likes: { where: { userId: viewerId }, select: { id: true } },
  }) as const;

type CommentRow = {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  parentId: string | null;
  user: {
    id: string;
    username: string | null;
    profileImageMimeType: string | null;
  };
  _count: { likes: number };
  likes: { id: string }[];
};

interface CommentNode {
  id: string;
  content: string;
  createdAt: Date;
  isOwnComment: boolean;
  likeCount: number;
  isLikedByViewer: boolean;
  author: {
    id: string;
    username: string | null;
    profileImageUrl: string | null;
  };
  replies: CommentNode[];
}

const toCommentNode = (comment: CommentRow, viewerId: string): CommentNode => ({
  id: comment.id,
  content: comment.content,
  createdAt: comment.createdAt,
  isOwnComment: comment.userId === viewerId,
  likeCount: comment._count.likes,
  isLikedByViewer: comment.likes.length > 0,
  author: {
    id: comment.user.id,
    username: comment.user.username,
    profileImageUrl: comment.user.profileImageMimeType
      ? `/api/users/${comment.user.id}/profile-image`
      : null,
  },
  replies: [],
});

// Comments can reply to comments, at any depth ("recursion") — rather than
// a recursive query per level, the whole post's comment set is fetched
// flat in one query and assembled into a tree here in application code.
const toCommentTree = (rows: CommentRow[], viewerId: string): CommentNode[] => {
  const byId = new Map<string, CommentNode>();
  for (const row of rows) {
    byId.set(row.id, toCommentNode(row, viewerId));
  }

  const roots: CommentNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

export const getComments = async (viewerId: string, postId: string) => {
  const rows = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    select: getCommentSelect(viewerId),
  });

  return toCommentTree(rows, viewerId);
};

export const addComment = async (
  userId: string,
  postId: string,
  content: string,
  parentId?: string | null,
) => {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AppError(400, "Comment can't be empty");
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!post) {
    throw new AppError(404, "Post not found");
  }

  if (parentId) {
    // A reply must target a comment that actually belongs to this post —
    // otherwise a client could stitch together threads across posts.
    const parent = await prisma.postComment.findFirst({
      where: { id: parentId, postId },
      select: { id: true },
    });

    if (!parent) {
      throw new AppError(404, "Comment not found");
    }
  }

  const comment = await prisma.postComment.create({
    data: { postId, userId, content: trimmed, parentId: parentId ?? null },
    select: getCommentSelect(userId),
  });

  await createNotification({
    userId: post.userId,
    actorId: userId,
    type: "post_comment",
    postId,
    commentId: comment.id,
  });

  return toCommentNode(comment, userId);
};

export const deleteComment = async (userId: string, commentId: string) => {
  const comment = await prisma.postComment.findFirst({
    where: { id: commentId, userId },
    select: { id: true },
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  // Replies cascade with it (schema's onDelete: Cascade on parentId) —
  // deleting a comment takes its whole reply subtree with it.
  await prisma.postComment.delete({ where: { id: commentId } });
};

export const likeComment = async (userId: string, commentId: string) => {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  await prisma.commentLike.upsert({
    where: { commentId_userId: { commentId, userId } },
    create: { commentId, userId },
    update: {},
  });
};

export const unlikeComment = async (userId: string, commentId: string) => {
  await prisma.commentLike.deleteMany({ where: { commentId, userId } });
};
