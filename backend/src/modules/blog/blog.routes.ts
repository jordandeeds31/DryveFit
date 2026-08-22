import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import {
  createBlogPostHandler,
  getBlogPostsHandler,
  getBlogPostHandler,
  deleteBlogPostHandler,
} from "./blog.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  // A cover image only needs to be a lot smaller than Feed's 50MB
  // (image-or-video) cap — Cloudinary's transform caps dimensions further
  // on top of this either way.
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Same error-wrapping as posts.routes.ts's uploadMediaMiddleware — multer
// reports upload problems as a plain MulterError/Error, not an AppError,
// which errorHandler's isOperational check would otherwise mask behind an
// opaque "Something went wrong".
const uploadCoverImageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload.single("coverImage")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new AppError(
            413,
            "That image is too large — try a smaller one (15MB max).",
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

router.get("/", getBlogPostsHandler);
router.post("/", uploadCoverImageMiddleware, createBlogPostHandler);
router.get("/:blogPostId", getBlogPostHandler);
router.delete("/:blogPostId", deleteBlogPostHandler);

export default router;
