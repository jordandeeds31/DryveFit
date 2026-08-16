import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getNotificationsHandler,
  getUnreadCountHandler,
  markAllReadHandler,
} from "./notifications.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getNotificationsHandler);
router.get("/unread-count", getUnreadCountHandler);
router.post("/mark-read", markAllReadHandler);

export default router;
