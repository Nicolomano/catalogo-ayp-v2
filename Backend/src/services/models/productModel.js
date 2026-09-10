import mongoose from "mongoose";
import Config from "./configModel.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    productCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      default: null,
    },

    // 💰 precios
    priceUSD: { type: Number },
    priceARS: { type: Number },
    fixedInARS: { type: Boolean, default: false },

    brand: { type: String, trim: true, default: null },

    // ✅ categorías y subcategorías como strings (no ObjectId)
    categories: [{ type: String, trim: true }],
    subcategories: [{ type: String, trim: true }],

    // 📊 estado y métricas
    active:    { type: Boolean, default: true },
    inStock:   { type: Boolean, default: true },
    featured:  { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },
    views:     { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// 🔍 índices de texto para búsqueda
productSchema.index({ name: "text", productCode: "text", description: "text" });

// 📈 índices compuestos para queries del catálogo (escalabilidad a 10k+ productos)
// Nota: NO se puede combinar categories y subcategories en un mismo índice
// porque MongoDB rechaza inserts cuando ambos campos son arrays ("parallel arrays")
productSchema.index({ active: 1, categories: 1 });
productSchema.index({ active: 1, subcategories: 1 });
productSchema.index({ active: 1, priceARS: 1 });
productSchema.index({ active: 1, soldCount: -1 });
productSchema.index({ active: 1, views: -1 });
productSchema.index({ active: 1, createdAt: -1 });
productSchema.index({ featured: 1, featuredOrder: 1 });

// ⚙️ recalcula el precio en ARS si no es fijo
productSchema.pre("save", async function (next) {
  if (this.fixedInARS === true) return next();

  try {
    if (this.priceUSD == null) return next();   // sin precio USD → no recalcular
    const cfg = await Config.findOne();
    const rate = Number(cfg?.exchangeRate);
    // Sin cotización usable NO se toca el precio. Antes quedaba en 0 (si era 0)
    // o en NaN (si no estaba definida), y este hook corre en cada save() — o sea
    // que tocar el switch de stock de un producto le rompía el precio.
    if (!Number.isFinite(rate) || rate <= 0) {
      console.warn(
        `Sin cotización cargada: se mantiene el precio en pesos de ${this.productCode}.`
      );
      return next();
    }
    this.priceARS = Number(this.priceUSD) * rate;
  } catch (err) {
    console.error("Error aplicando tasa de cambio:", err);
  }

  next();
});

export default mongoose.model("Product", productSchema);
