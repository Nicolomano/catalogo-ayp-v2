import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoriesTree,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect } from "../middlewares/authMiddleware.js";

const categoryRouter = express.Router();

categoryRouter.get("/", getAllCategories);              // público — necesario para el catálogo
categoryRouter.get("/tree", getCategoriesTree);        // público
categoryRouter.post("/", protect, createCategory);     // solo admin
categoryRouter.delete("/:id", protect, deleteCategory); // solo admin

export default categoryRouter;
