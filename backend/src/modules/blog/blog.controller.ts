import { Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/apiResponse";
import AppError from "../../utils/AppError";
import { AuthRequest } from "../../middleware/authMiddleware";
import {
  createBlogPost,
  getBlogPosts,
  getBlogPost,
  deleteBlogPost,
} from "./blog.service";

export const createBlogPostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { title, body } = req.body;
    const file = req.file;

    if (typeof title !== "string" || typeof body !== "string") {
      throw new AppError(400, "title and body are required");
    }
    if (file && !file.mimetype.startsWith("image/")) {
      throw new AppError(400, "Cover image must be an image file");
    }

    const post = await createBlogPost({
      userId: req.userId!,
      title,
      body,
      coverImageBuffer: file?.buffer ?? null,
    });

    sendSuccess(res, 201, "BLOG_POST_CREATED", { post });
  },
);

export const getBlogPostsHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const posts = await getBlogPosts(req.userId!);
    sendSuccess(res, 200, "BLOG_POSTS_FETCHED", { posts });
  },
);

export const getBlogPostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { blogPostId } = req.params as { blogPostId: string };
    const post = await getBlogPost(req.userId!, blogPostId);
    sendSuccess(res, 200, "BLOG_POST_FETCHED", { post });
  },
);

export const deleteBlogPostHandler = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { blogPostId } = req.params as { blogPostId: string };
    await deleteBlogPost(req.userId!, blogPostId);
    sendSuccess(res, 200, "BLOG_POST_DELETED", {});
  },
);
