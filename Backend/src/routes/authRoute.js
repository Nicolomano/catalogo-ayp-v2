import { Router } from "express";
import {
  login,
  registerAdmin,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import { loginLimiter, passwordResetLimiter } from "../middlewares/rateLimiters.js";

const authRouter = Router();

authRouter.post("/register", protect, requireAdmin, registerAdmin);
authRouter.post("/login", loginLimiter, login);

// Recuperación de contraseña (pública, con límite propio)
authRouter.post("/forgot-password", passwordResetLimiter, forgotPassword);
authRouter.post("/reset-password", passwordResetLimiter, resetPassword);

export default authRouter;
