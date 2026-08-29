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
  getProductBrands,
  migrateCategories,
  listFeaturedAdmin,
  reorderFeatured,
} from "../controllers/productsController.js";
import { protect } from "../middlewares/authMiddleware.js";
import uploadCloud, { uploadExcel } from "../middlewares/multer.js";

const productRouter = express.Router();

// ── Rutas estáticas (deben ir ANTES de /:category) ───────────────

// Públicas
productRouter.get("/meta/categories", getCategoriesMeta);
productRouter.get("/landing",         getLandingProducts);
productRouter.get("/brands",          getProductBrands);
productRouter.get("/code/:productCode", getProductByCode);
productRouter.get("/export/excel",    exportProductsExcel);

// Admin
productRouter.get("/admin/all",             protect, getProductsAdmin);
productRouter.get("/featured/list",         protect, listFeaturedAdmin);
productRouter.patch("/featured/reorder",    protect, reorderFeatured);
productRouter.post("/admin/migrate-categories", protect, migrateCategories);
productRouter.post("/import/excel",         protect, uploadExcel.single("file"), importProductsExcel);
productRouter.post("/import/preview",        protect, uploadExcel.single("file"), previewImportExcel);
productRouter.post("/import/commit",         protect, uploadExcel.single("file"), commitImportExcel);
productRouter.post("/upload",         protect, uploadCloud.single("image"), uploadImage);
productRouter.post("/",               protect, uploadCloud.single("image"), createProduct);
productRouter.put("/:id",             protect, uploadCloud.single("image"), updateProduct);
productRouter.delete("/:id",          protect, deleteProduct);
productRouter.patch("/:id/toggle",    protect, toggleProduct);
productRouter.patch("/:id/featured",  protect, toggleFeatured);
productRouter.patch("/:id/stock",     protect, toggleStock);

// ── Ruta genérica — SIEMPRE AL FINAL ────────────────────────────
productRouter.get("/",          getProductsByCategory);
productRouter.get("/:category", getProductsByCategory);

export default productRouter;
