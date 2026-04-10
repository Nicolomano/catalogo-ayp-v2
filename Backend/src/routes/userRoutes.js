import { Router } from "express";
import {
  registerServiceUser,
  listServiceUsers,
  updateServiceUserStatus,
} from "../controllers/serviceUserController.js";
import { protect } from "../middlewares/authMiddleware.js";

const userRouter = Router();

// Público — el técnico se registra
userRouter.post("/register", registerServiceUser);

// Protegidas — solo admin
userRouter.get("/", protect, listServiceUsers);
userRouter.patch("/:id/status", protect, updateServiceUserStatus);

export default userRouter;
