import express from "express";
import { signup, login, forgotPassword, resetPassword } from "./auth.controller";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
