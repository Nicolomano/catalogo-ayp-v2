import express from "express";
import {
  getTecnicos,
  getTecnicoById,
  getZonesAndSpecialties,
  getTecnicosAdmin,
  createTecnico,
  updateTecnico,
  deleteTecnico,
  toggleActive,
  toggleRecommended,
  addWorkPhoto,
  deleteWorkPhoto,
} from "../controllers/tecnicoController.js";
import { protect } from "../middlewares/authMiddleware.js";
import uploadCloud from "../middlewares/multer.js";

const router = express.Router();

// ── Públicas (estáticas ANTES de la dinámica /:id) ────────────────────────────
router.get("/filters",    getZonesAndSpecialties);
router.get("/admin/all",  protect, getTecnicosAdmin);
router.get("/",           getTecnicos);

// ── Admin CRUD ────────────────────────────────────────────────────────────────
router.post("/",   protect, uploadCloud.single("photo"), createTecnico);
router.put("/:id", protect, uploadCloud.single("photo"), updateTecnico);
router.delete("/:id", protect, deleteTecnico);
router.patch("/:id/toggle",    protect, toggleActive);
router.patch("/:id/recommend", protect, toggleRecommended);

// ── Galería de trabajos ───────────────────────────────────────────────────────
router.post("/:id/works",         protect, uploadCloud.single("image"), addWorkPhoto);
router.delete("/:id/works/:index", protect, deleteWorkPhoto);

// ── Detalle público (al final para no chocar con /filters, /admin/all) ───────
router.get("/:id", getTecnicoById);

export default router;
