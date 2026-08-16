import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getMeHandler,
  updateMeHandler,
  deleteMeHandler,
  updatePushTokenHandler,
  clearPushTokenHandler,
  uploadProfileImageHandler,
  deleteProfileImageHandler,
  getProfileImageHandler,
  getPublicProfileHandler,
  getPublicWorkoutHistoryHandler,
  getPublicActiveProgramHandler,
  getPublicNutritionHistoryHandler,
  getPublicPostsHandler,
  searchUsersHandler,
  followUserHandler,
  unfollowUserHandler,
} from "./users.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB raw cap before sharp compresses it
});

const router = Router();

router.use(authMiddleware);

router.get("/me", getMeHandler);
router.patch("/me", updateMeHandler);
router.delete("/me", deleteMeHandler);
router.patch("/me/push-token", updatePushTokenHandler);
router.delete("/me/push-token", clearPushTokenHandler);
router.post(
  "/me/profile-image",
  upload.single("image"),
  uploadProfileImageHandler,
);
router.delete("/me/profile-image", deleteProfileImageHandler);
router.get("/search", searchUsersHandler);
router.get("/:userId/profile-image", getProfileImageHandler);
router.get("/:userId/public-profile", getPublicProfileHandler);
router.get("/:userId/workouts", getPublicWorkoutHistoryHandler);
router.get("/:userId/active-program", getPublicActiveProgramHandler);
router.get("/:userId/nutrition", getPublicNutritionHistoryHandler);
router.get("/:userId/posts", getPublicPostsHandler);
router.post("/:userId/follow", followUserHandler);
router.delete("/:userId/follow", unfollowUserHandler);

export default router;
