import express from "express";
import {
  createProduct,
  uploadImage,
  updateProduct,
  getProductByCode,
  getProductsByCategory,
  deleteProduct,
  toggleProduct,
  toggleFeatured,
  toggleStock,
  getProductsAdmin,
  getCategoriesMeta,
  exportProductsExcel,
  importProductsExcel,
  previewImportExcel,
  commitImportExcel,
  getLandingProducts,
  getProductsSitemap,
  getProductBrands,
  listFeaturedAdmin,
  reorderFeatured,
} from "../controllers/productsController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import uploadCloud, { uploadExcel } from "../middlewares/multer.js";

const productRouter = express.Router();

// ── Rutas estáticas (deben ir ANTES de /:category) ───────────────

// Públicas
productRouter.get("/meta/categories", getCategoriesMeta);
productRouter.get("/landing",         getLandingProducts);
productRouter.get("/brands",          getProductBrands);
productRouter.get("/code/:productCode", getProductByCode);
productRouter.get("/sitemap",         getProductsSitemap);
// NO es público: exporta la lista de precios completa (ARS y USD).
productRouter.get("/export/excel",    protect, requireAdmin, exportProductsExcel);

// Admin
productRouter.get("/admin/all",             protect, requireAdmin, getProductsAdmin);
productRouter.get("/featured/list",         protect, requireAdmin, listFeaturedAdmin);
productRouter.patch("/featured/reorder",    protect, requireAdmin, reorderFeatured);
// migrate-categories: script de migración de una sola vez, no se expone como ruta HTTP.
// El controller sigue en productsController.js por si hay que volver a correrlo.
productRouter.post("/import/excel",         protect, requireAdmin, uploadExcel.single("file"), importProductsExcel);
productRouter.post("/import/preview",        protect, requireAdmin, uploadExcel.single("file"), previewImportExcel);
productRouter.post("/import/commit",         protect, requireAdmin, uploadExcel.single("file"), commitImportExcel);
productRouter.post("/upload",         protect, requireAdmin, uploadCloud.single("image"), uploadImage);
productRouter.post("/",               protect, requireAdmin, uploadCloud.single("image"), createProduct);
productRouter.put("/:id",             protect, requireAdmin, uploadCloud.single("image"), updateProduct);
productRouter.delete("/:id",          protect, requireAdmin, deleteProduct);
productRouter.patch("/:id/toggle",    protect, requireAdmin, toggleProduct);
productRouter.patch("/:id/featured",  protect, requireAdmin, toggleFeatured);
productRouter.patch("/:id/stock",     protect, requireAdmin, toggleStock);

// ── Ruta genérica — SIEMPRE AL FINAL ────────────────────────────
productRouter.get("/",          getProductsByCategory);
productRouter.get("/:category", getProductsByCategory);

export default productRouter;
