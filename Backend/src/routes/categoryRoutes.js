import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoriesTree,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, requireAdmin, requireNivelTotal } from "../middlewares/authMiddleware.js";

const categoryRouter = express.Router();

categoryRouter.get("/", getAllCategories);              // público — necesario para el catálogo
categoryRouter.get("/tree", getCategoriesTree);        // público
categoryRouter.post("/", protect, requireAdmin, createCategory);     // solo admin
// Borrar una categoría desarma la navegación del catálogo: nivel total.
categoryRouter.delete("/:id", protect, requireAdmin, requireNivelTotal, deleteCategory);

export default categoryRouter;
