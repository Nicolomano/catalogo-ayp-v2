import { Router } from "express";
import {
  registerServiceUser,
  listServiceUsers,
  updateServiceUserStatus,
} from "../controllers/serviceUserController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import uploadCloud from "../middlewares/multer.js";
import { registerLimiter } from "../middlewares/rateLimiters.js";

const userRouter = Router();

// Público — el técnico se registra (acepta imagen de matrícula opcional)
userRouter.post("/register", registerLimiter, uploadCloud.single("matriculaImage"), registerServiceUser);

// Protegidas — solo admin
userRouter.get("/", protect, requireAdmin, listServiceUsers);
userRouter.patch("/:id/status", protect, requireAdmin, updateServiceUserStatus);

export default userRouter;
