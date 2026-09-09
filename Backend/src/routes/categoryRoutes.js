import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoriesTree,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";

const categoryRouter = express.Router();

categoryRouter.get("/", getAllCategories);              // público — necesario para el catálogo
categoryRouter.get("/tree", getCategoriesTree);        // público
categoryRouter.post("/", protect, requireAdmin, createCategory);     // solo admin
categoryRouter.delete("/:id", protect, requireAdmin, deleteCategory); // solo admin

export default categoryRouter;
