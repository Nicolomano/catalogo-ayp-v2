import { Router } from "express";
import { registrarVisita } from "../controllers/pageViewController.js";
import { viewLimiter } from "../middlewares/rateLimiters.js";

const metricsRouter = Router();

// Público: lo llama el navegador de cada visitante al cambiar de página.
metricsRouter.post("/view", viewLimiter, registrarVisita);

export default metricsRouter;
