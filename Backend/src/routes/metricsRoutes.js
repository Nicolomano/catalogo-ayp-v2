import { Router } from "express";
import { registrarVisita, registrarBusqueda } from "../controllers/pageViewController.js";
import { viewLimiter } from "../middlewares/rateLimiters.js";

const metricsRouter = Router();

// Público: lo llama el navegador de cada visitante al cambiar de página.
metricsRouter.post("/view", viewLimiter, registrarVisita);

// Público: lo llama el catálogo cuando la persona dejó de escribir en el buscador.
metricsRouter.post("/search", viewLimiter, registrarBusqueda);

export default metricsRouter;
