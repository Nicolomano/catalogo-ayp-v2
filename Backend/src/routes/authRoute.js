import { Router } from "express";
import {
  login,
  registerAdmin,
  listAdmins,
  updateAdmin,
  deleteAdmin,
  cambiarMiPassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect, requireAdmin, requireNivelTotal } from "../middlewares/authMiddleware.js";
import { loginLimiter, passwordResetLimiter } from "../middlewares/rateLimiters.js";

const authRouter = Router();

authRouter.post("/login", loginLimiter, login);

// Administración de usuarios del panel: solo nivel total. Quien tiene acceso a
// crear admins tiene acceso a todo, así que esto no puede quedar en manos de una
// cuenta limitada.
const soloTotal = [protect, requireAdmin, requireNivelTotal];
authRouter.get("/admins", soloTotal, listAdmins);
authRouter.post("/register", soloTotal, registerAdmin);
authRouter.put("/admins/:id", soloTotal, updateAdmin);
authRouter.delete("/admins/:id", soloTotal, deleteAdmin);

// Cambiar la contraseña propia: cualquier administrador, sin importar el nivel.
authRouter.put("/mi-password", protect, requireAdmin, cambiarMiPassword);

// Recuperación de contraseña (pública, con límite propio)
authRouter.post("/forgot-password", passwordResetLimiter, forgotPassword);
authRouter.post("/reset-password", passwordResetLimiter, resetPassword);

export default authRouter;
