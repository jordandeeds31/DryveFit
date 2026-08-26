import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  createPostHandler,
  getFeedHandler,
  getPostCountsHandler,
  getNewPostsCountHandler,
  markFeedViewedHandler,
  getPostHandler,
  deletePostHandler,
  likePostHandler,
  unlikePostHandler,
  getCommentsHandler,
  addCommentHandler,
  deleteCommentHandler,
  likeCommentHandler,
  unlikeCommentHandler,
} from "./posts.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  // 50MB raw cap — big enough for a short video clip (images are nowhere
  // near this in practice); Cloudinary's own transform caps dimensions
  // further on top of this.
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Multer reports upload problems (oversized file, malformed multipart
// body, ...) by calling next(err) with a plain MulterError/Error — not an
// AppError, so errorHandler's isOperational check masked it behind an
// opaque "Something went wrong" in production with no way to tell what
// actually happened. Wrapping the middleware and converting its errors to
// an AppError with the real reason both fixes what the user sees and
// makes the actual cause visible if it happens again.
const uploadMediaMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single("media")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError(
            413,
            "That file is too large — try a smaller photo or video (50MB max).",
          ),
        );
      }
      return next(new AppError(400, err.message));
    }
    next(err instanceof Error ? new AppError(400, err.message) : err);
  });
};

const router = Router();

router.use(authMiddleware);

router.get("/", getFeedHandler);
router.post("/", uploadMediaMiddleware, createPostHandler);
// Must come before the "/:postId" routes below — otherwise Express would
// match "new-count"/"mark-feed-viewed"/"counts" as a :postId param instead.
router.get("/counts", getPostCountsHandler);
router.get("/new-count", getNewPostsCountHandler);
router.post("/mark-feed-viewed", markFeedViewedHandler);
router.get("/:postId", getPostHandler);
router.delete("/:postId", deletePostHandler);
router.post("/:postId/like", likePostHandler);
router.delete("/:postId/like", unlikePostHandler);
router.get("/:postId/comments", getCommentsHandler);
router.post("/:postId/comments", addCommentHandler);
router.delete("/comments/:commentId", deleteCommentHandler);
router.post("/comments/:commentId/like", likeCommentHandler);
router.delete("/comments/:commentId/like", unlikeCommentHandler);

export default router;
