import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, requireAdmin } from "../middlewares/authMiddleware.js";
import { orderLimiter } from "../middlewares/rateLimiters.js";

const orderRouter = Router();

orderRouter.post("/", orderLimiter, createOrder);          // crear orden (público — lo hace el cliente)
orderRouter.get("/", protect, requireAdmin, getOrders);                  // listar todas (solo admin)
orderRouter.get("/:id", protect, requireAdmin, getOrderById);            // ver una (solo admin)
orderRouter.patch("/:id/status", protect, requireAdmin, updateOrderStatus); // cambiar estado (solo admin)

export default orderRouter;
