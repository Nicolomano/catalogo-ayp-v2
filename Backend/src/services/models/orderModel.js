import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: String,
        productCode: String,
            quantity: { type: Number, required: true, min: 1 },
        priceUSD: Number,
        priceARS: Number,
      },
    ],
    totalUSD: { type: Number, required: true },
    totalARS: { type: Number, required: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    status: {
      type: String,
      enum: ["pendiente", "contestada"],
      default: "pendiente",
    },
  },
  { timestamps: true }
);

// La colección no tenía ningún índice: `find().sort({createdAt:-1})` ordenaba en
// memoria (Mongo aborta pasados los 32MB) y toda métrica por fecha era un scan
// completo de la colección.
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Order", orderSchema);
