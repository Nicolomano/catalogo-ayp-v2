import express from "express";
import {
  listPublicBanners,
  listAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner,
  reorderBanners,
} from "../controllers/bannerController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import uploadBanner from "../middlewares/multerBanners.js";

const router = express.Router();

// Público
router.get("/", listPublicBanners);

// Admin
router.get("/admin/all", protect, requireAdmin, listAdminBanners);
router.post("/", protect, requireAdmin, uploadBanner.single("image"), createBanner);
router.put("/:id", protect, requireAdmin, uploadBanner.single("image"), updateBanner);
router.delete("/:id", protect, requireAdmin, deleteBanner);
router.patch("/reorder", protect, requireAdmin, reorderBanners);   // ANTES de /:id para evitar captura
router.patch("/:id/toggle", protect, requireAdmin, toggleBanner);

export default router;
