import { Router } from "express";
import { login, registerAdmin } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.post("/register", protect, registerAdmin);
authRouter.post("/login", login);

export default authRouter;
