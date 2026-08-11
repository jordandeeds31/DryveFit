import { Router } from "express";
import { joinWaitlistHandler } from "./waitlist.controller";

const router = Router();

router.post("/", joinWaitlistHandler);

export default router;
