import express from "express";
import { getConfig, updateConfig, uploadHeroImage } from "../controllers/siteConfigController.js";
import { protect } from "../middlewares/authMiddleware.js";
import uploadBanner from "../middlewares/multerBanners.js";

const router = express.Router();

router.get("/", getConfig);
router.put("/", protect, updateConfig);
router.post("/hero-image", protect, uploadBanner.single("image"), uploadHeroImage);

export default router;
