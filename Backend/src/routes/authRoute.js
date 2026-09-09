import { Router } from "express";
import { login, registerAdmin } from "../controllers/authController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.post("/register", protect, requireAdmin, registerAdmin);
authRouter.post("/login", login);

export default authRouter;
