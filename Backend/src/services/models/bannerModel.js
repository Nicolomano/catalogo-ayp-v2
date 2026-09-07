import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    label: String, // etiqueta chica del banner promo, ej: "NUEVO INGRESO"
    title: String,
    subtitle: String,
    image: { type: String, required: true }, // URL en Cloudflare R2
    linkUrl: String, // opcional
    // "promo" se renderiza como componente (PromoBanner), no como imagen:
    // la imagen es solo la foto del producto, recortada y sin fondo.
    type: { type: String, enum: ["home", "catalog", "promo"], default: "home" },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Banner = mongoose.model("banners", bannerSchema);
export default Banner;
