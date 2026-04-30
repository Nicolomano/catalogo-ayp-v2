import { Router } from "express";
import {
  registerServiceUser,
  listServiceUsers,
  updateServiceUserStatus,
} from "../controllers/serviceUserController.js";
import { protect } from "../middlewares/authMiddleware.js";
import uploadCloud from "../middlewares/multer.js";

const userRouter = Router();

// Público — el técnico se registra (acepta imagen de matrícula opcional)
userRouter.post("/register", uploadCloud.single("matriculaImage"), registerServiceUser);

// Protegidas — solo admin
userRouter.get("/", protect, listServiceUsers);
userRouter.patch("/:id/status", protect, updateServiceUserStatus);

export default userRouter;
