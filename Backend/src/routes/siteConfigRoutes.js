import express from "express";
import { getConfig, updateConfig, uploadHeroImage } from "../controllers/siteConfigController.js";
import { protect, requireAdmin, requireNivelTotal } from "../middlewares/authMiddleware.js";
import uploadBanner from "../middlewares/multerBanners.js";

const router = express.Router();

router.get("/", getConfig);
// Datos de contacto, textos del inicio y portada: nivel total.
router.put("/", protect, requireAdmin, requireNivelTotal, updateConfig);
router.post("/hero-image", protect, requireAdmin, requireNivelTotal, uploadBanner.single("image"), uploadHeroImage);

export default router;
