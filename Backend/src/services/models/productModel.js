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
productSchema.index({ active: 1, categories: 1, subcategories: 1 });
productSchema.index({ active: 1, priceARS: 1 });
productSchema.index({ active: 1, soldCount: -1 });
productSchema.index({ active: 1, views: -1 });
productSchema.index({ active: 1, createdAt: -1 });

// ⚙️ recalcula el precio en ARS si no es fijo
productSchema.pre("save", async function (next) {
  if (this.fixedInARS === true) return next();

  try {
    if (this.priceUSD == null) return next();   // sin precio USD → no recalcular
    const cfg = await Config.findOne();
    const rate = cfg ? cfg.exchangeRate : 1;
    this.priceARS = Number(this.priceUSD) * Number(rate);
  } catch (err) {
    console.error("Error aplicando tasa de cambio:", err);
  }

  next();
});

export default mongoose.model("Product", productSchema);
