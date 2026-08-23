import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { searchCitiesHandler, getCountriesHandler } from "./cities.controller";

const router = Router();

router.use(authMiddleware);

router.get("/countries", getCountriesHandler);
router.get("/", searchCitiesHandler);

export default router;
