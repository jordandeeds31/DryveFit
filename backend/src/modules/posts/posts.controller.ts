import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import { AuthRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  createPost,
  getFeed,
  getPostCounts,
  getNewPostsCount,
  markFeedViewed,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  deleteComment,
  likeComment,
  unlikeComment,
} from "./posts.service";

export const createPostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { caption } = req.body;
    const file = req.file;

    if (caption !== undefined && typeof caption !== "string") {
      throw new AppError(400, "caption must be a string");
    }

    let mediaType: "image" | "video" | null = null;
    if (file) {
      if (file.mimetype.startsWith("image/")) {
        mediaType = "image";
      } else if (file.mimetype.startsWith("video/")) {
        mediaType = "video";
      } else {
        throw new AppError(400, "File must be an image or a video");
      }
    }

    const post = await createPost({
      userId: req.userId!,
      caption: caption ?? null,
      mediaBuffer: file?.buffer ?? null,
      mediaType,
    });

    sendSuccess(res, 201, "POST_CREATED", { post });
  },
);

export const getFeedHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const feed = await getFeed(req.userId!, cursor);
    sendSuccess(res, 200, "FEED_FETCHED", feed);
  },
);

export const getPostCountsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const idsParam = req.query.ids;

    if (typeof idsParam !== "string" || !idsParam.trim()) {
      throw new AppError(400, "ids is required");
    }

    const ids = idsParam.split(",").filter(Boolean);
    const counts = await getPostCounts(req.userId!, ids);
    sendSuccess(res, 200, "POST_COUNTS_FETCHED", { counts });
  },
);

export const getNewPostsCountHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const result = await getNewPostsCount(req.userId!);
    sendSuccess(res, 200, "NEW_POSTS_COUNT_FETCHED", result);
  },
);

export const markFeedViewedHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    await markFeedViewed(req.userId!);
    sendSuccess(res, 200, "FEED_MARKED_VIEWED", { message: "Marked viewed" });
  },
);

export const getPostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;

    if (typeof postId !== "string") {
      throw new AppError(400, "postId is required");
    }

    const post = await getPostById(req.userId!, postId);
    sendSuccess(res, 200, "POST_FETCHED", { post });
  },
);

export const deletePostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;

    if (typeof postId !== "string") {
      throw new AppError(400, "postId is required");
    }

    await deletePost(req.userId!, postId);
    sendSuccess(res, 200, "POST_DELETED", { message: "Deleted" });
  },
);

export const likePostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;

    if (typeof postId !== "string") {
      throw new AppError(400, "postId is required");
    }

    await likePost(req.userId!, postId);
    sendSuccess(res, 200, "POST_LIKED", { message: "Liked" });
  },
);

export const unlikePostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;

    if (typeof postId !== "string") {
      throw new AppError(400, "postId is required");
    }

    await unlikePost(req.userId!, postId);
    sendSuccess(res, 200, "POST_UNLIKED", { message: "Unliked" });
  },
);

export const getCommentsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;

    if (typeof postId !== "string") {
      throw new AppError(400, "postId is required");
    }

    const comments = await getComments(req.userId!, postId);
    sendSuccess(res, 200, "COMMENTS_FETCHED", { comments });
  },
);

export const addCommentHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { postId } = req.params;
    const { content, parentId } = req.body;

    if (typeof postId !== "string") {
      throw new AppError(400, "postId is required");
    }
    if (typeof content !== "string") {
      throw new AppError(400, "content is required");
    }
    if (parentId !== undefined && typeof parentId !== "string") {
      throw new AppError(400, "parentId must be a string");
    }

    const comment = await addComment(req.userId!, postId, content, parentId);
    sendSuccess(res, 201, "COMMENT_ADDED", { comment });
  },
);

export const deleteCommentHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { commentId } = req.params;

    if (typeof commentId !== "string") {
      throw new AppError(400, "commentId is required");
    }

    await deleteComment(req.userId!, commentId);
    sendSuccess(res, 200, "COMMENT_DELETED", { message: "Deleted" });
  },
);

export const likeCommentHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { commentId } = req.params;

    if (typeof commentId !== "string") {
      throw new AppError(400, "commentId is required");
    }

    await likeComment(req.userId!, commentId);
    sendSuccess(res, 200, "COMMENT_LIKED", { message: "Liked" });
  },
);

export const unlikeCommentHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { commentId } = req.params;

    if (typeof commentId !== "string") {
      throw new AppError(400, "commentId is required");
    }

    await unlikeComment(req.userId!, commentId);
    sendSuccess(res, 200, "COMMENT_UNLIKED", { message: "Unliked" });
  },
);
