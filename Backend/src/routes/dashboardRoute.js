import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { getMetrics } from "../controllers/metricsController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";

const dashboardRouter = express.Router();
// /metrics antes que "/" no hace falta (paths distintos), pero se declara primero
// por claridad: es el endpoint con las agregaciones del negocio.
dashboardRouter.get("/metrics", protect, requireAdmin, getMetrics);
dashboardRouter.get("/", protect, requireAdmin, getDashboardData);
export default dashboardRouter;
