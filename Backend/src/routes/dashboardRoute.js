import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";

const dashboardRouter = express.Router();
dashboardRouter.get("/", protect, requireAdmin, getDashboardData);
export default dashboardRouter;
