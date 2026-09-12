import express from "express";
import {
  updateExchangeRate,
  getExchangeRate,
  getInstallKit,
  updateInstallKit,
} from "../controllers/configController.js";
import { config } from "dotenv";
import { protect, requireAdmin, requireNivelTotal } from "../middlewares/authMiddleware.js";
const configRouter = express.Router();

// Cotización y kit de instalación afectan precios en todo el sitio: nivel total.
configRouter.put("/", protect, requireAdmin, requireNivelTotal, updateExchangeRate);

configRouter.get("/", getExchangeRate);
configRouter.get("/install-kit", getInstallKit);
configRouter.put("/install-kit", protect, requireAdmin, requireNivelTotal, updateInstallKit);

export default configRouter;
