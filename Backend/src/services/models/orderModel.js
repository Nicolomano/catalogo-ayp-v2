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

        /**
         * Si la línea es un combo, de qué piezas estaba hecho.
         *
         * En el sistema de A&P los combos no existen: el presupuesto final se
         * carga pieza por pieza, así que el pedido tiene que traer los códigos.
         *
         * Es una FOTO del momento del pedido, no una referencia al combo: si
         * mañana se le cambian las piezas, este presupuesto tiene que seguir
         * diciendo lo que se pidió ese día.
         *
         * `quantity` es la cantidad TOTAL a facturar, ya multiplicada por la
         * cantidad de combos pedidos: es el número que se carga en el sistema.
         */
        componentes: [
          {
            _id: false,
            name: String,
            productCode: String,
            quantity: Number,
          },
        ],
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
