import { Router } from "express";
import {
  registerServiceUser,
  listServiceUsers,
  updateServiceUserStatus,
  updateServiceUser,
  getMatricula,
} from "../controllers/serviceUserController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import uploadCloud from "../middlewares/multer.js";
import { registerLimiter } from "../middlewares/rateLimiters.js";
import { blockOnMaintenance } from "../middlewares/maintenance.js";

const userRouter = Router();

// Público — el técnico se registra (acepta imagen de matrícula opcional)
userRouter.post(
  "/register",
  registerLimiter,
  blockOnMaintenance,
  uploadCloud.single("matriculaImage"),
  registerServiceUser
);

// Protegidas — solo admin
userRouter.get("/", protect, requireAdmin, listServiceUsers);
userRouter.patch("/:id/status", protect, requireAdmin, updateServiceUserStatus);
userRouter.patch("/:id", protect, requireAdmin, updateServiceUser);
// La imagen de matrícula es un documento personal: se sirve acá, autenticada,
// en vez de exponer una URL pública del bucket.
userRouter.get("/:id/matricula", protect, requireAdmin, getMatricula);

export default userRouter;
