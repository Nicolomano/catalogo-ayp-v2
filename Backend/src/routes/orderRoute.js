import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect } from "../middlewares/authMiddleware.js";

const orderRouter = Router();

orderRouter.post("/", createOrder);                        // crear orden (público — lo hace el cliente)
orderRouter.get("/", protect, getOrders);                  // listar todas (solo admin)
orderRouter.get("/:id", protect, getOrderById);            // ver una (solo admin)
orderRouter.patch("/:id/status", protect, updateOrderStatus); // cambiar estado (solo admin)

export default orderRouter;
