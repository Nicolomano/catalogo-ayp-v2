import { Router } from "express";
import {
  registerServiceUser,
  listServiceUsers,
  updateServiceUserStatus,
  updateServiceUser,
  getMatricula,
  exportContactos,
} from "../controllers/serviceUserController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import { uploadMatricula } from "../middlewares/multer.js";
import { manejarErrorDeArchivo } from "../middlewares/uploadErrors.js";
import { registerLimiter } from "../middlewares/rateLimiters.js";
import { blockOnMaintenance } from "../middlewares/maintenance.js";

const userRouter = Router();

// Público — el técnico se registra (matrícula opcional: foto o PDF)
userRouter.post(
  "/register",
  registerLimiter,
  blockOnMaintenance,
  uploadMatricula.single("matriculaImage"),
  // Va acá, pegado al multer: convierte "formato no permitido" y "archivo muy
  // grande" en un 400 con mensaje, en vez del 500 genérico.
  manejarErrorDeArchivo,
  registerServiceUser
);

// Protegidas — solo admin
// Va ANTES de "/:id/..." para que "export" no se tome como un id.
userRouter.get("/export/contactos", protect, requireAdmin, exportContactos);
userRouter.get("/", protect, requireAdmin, listServiceUsers);
userRouter.patch("/:id/status", protect, requireAdmin, updateServiceUserStatus);
userRouter.patch("/:id", protect, requireAdmin, updateServiceUser);
// La imagen de matrícula es un documento personal: se sirve acá, autenticada,
// en vez de exponer una URL pública del bucket.
userRouter.get("/:id/matricula", protect, requireAdmin, getMatricula);

export default userRouter;
