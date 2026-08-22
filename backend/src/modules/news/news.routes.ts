import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { getNewsHandler } from "./news.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", getNewsHandler);

export default router;
