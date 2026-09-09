import express from "express";
import {
  updateExchangeRate,
  getExchangeRate,
  getInstallKit,
  updateInstallKit,
} from "../controllers/configController.js";
import { config } from "dotenv";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
const configRouter = express.Router();

configRouter.put("/", protect, requireAdmin, updateExchangeRate);

configRouter.get("/", getExchangeRate);
configRouter.get("/install-kit", getInstallKit);
configRouter.put("/install-kit", protect, requireAdmin, updateInstallKit);

export default configRouter;
