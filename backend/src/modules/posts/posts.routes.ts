import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  createPostHandler,
  getFeedHandler,
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

const router = Router();

router.use(authMiddleware);

router.get("/", getFeedHandler);
router.post("/", upload.single("media"), createPostHandler);
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
