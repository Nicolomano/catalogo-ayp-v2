import express from "express";
import { getConfig, updateConfig, uploadHeroImage } from "../controllers/siteConfigController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import uploadBanner from "../middlewares/multerBanners.js";

const router = express.Router();

router.get("/", getConfig);
router.put("/", protect, requireAdmin, updateConfig);
router.post("/hero-image", protect, requireAdmin, uploadBanner.single("image"), uploadHeroImage);

export default router;
