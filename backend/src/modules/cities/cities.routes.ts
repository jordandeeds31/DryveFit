import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { searchCitiesHandler } from "./cities.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", searchCitiesHandler);

export default router;
