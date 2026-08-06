import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getMeHandler,
  updateMeHandler,
  uploadProfileImageHandler,
  deleteProfileImageHandler,
  getProfileImageHandler,
  getPublicProfileHandler,
  getPublicWorkoutHistoryHandler,
} from "./users.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB raw cap before sharp compresses it
});

const router = Router();

router.use(authMiddleware);

router.get("/me", getMeHandler);
router.patch("/me", updateMeHandler);
router.post("/me/profile-image", upload.single("image"), uploadProfileImageHandler);
router.delete("/me/profile-image", deleteProfileImageHandler);
router.get("/:userId/profile-image", getProfileImageHandler);
router.get("/:userId/public-profile", getPublicProfileHandler);
router.get("/:userId/workouts", getPublicWorkoutHistoryHandler);

export default router;
