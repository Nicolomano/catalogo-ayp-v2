import Banner from "../services/models/bannerModel.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2 } from "../utils/r2.js";

export const listPublicBanners = async (req, res) => {
  try {
    const { type = "home" } = req.query;
    const items = await Banner.find({ active: true, type })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Error listando banners"});
  }
};

export const listAdminBanners = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const items = await Banner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error admin banners"});
  }
};

// Dimensiones según tipo: home = 900×900 (cuadrado), catalog = 1200×400 (3:1),
// promo = 800×800 pero con "contain" y fondo transparente, porque la imagen es
// la foto del producto que se monta sobre el gradiente del PromoBanner:
// recortarla con "cover" le comería los bordes.
const BANNER_SIZES = {
  home:    { width: 900,  height: 900,  fit: "cover"   },
  catalog: { width: 1200, height: 400,  fit: "cover"   },
  promo:   { width: 800,  height: 800,  fit: "contain" },
};

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function processBannerImage(buffer, type) {
  const { width, height, fit } = BANNER_SIZES[type] || BANNER_SIZES.home;
  return sharp(buffer)
    .resize(width, height, {
      fit,
      // "contain" necesita un fondo: transparente para que el producto flote
      // sobre el gradiente. "cover" usa el encuadre automático de sharp.
      ...(fit === "contain" ? { background: TRANSPARENT } : { position: "attention" }),
    })
    .webp({ quality: 85 })
    .toBuffer();
}

export const createBanner = async (req, res) => {
  try {
    const {
      label,
      title,
      subtitle,
      linkUrl,
      type = "home",
      order = 0,
      active = true,
    } = req.body;
    let image = req.body.image || null;
    if (req.file?.buffer) {
      const buffer = await processBannerImage(req.file.buffer, type);
      image = await uploadToR2(buffer, `banners/${uuidv4()}.webp`, "image/webp");
    }
    if (!image) return res.status(400).json({ message: "Imagen requerida" });

    const banner = await Banner.create({
      label,
      title,
      subtitle,
      linkUrl,
      type,
      order,
      active,
      image,
    });
    res.status(201).json(banner);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error creando banner"});
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };
    if (req.file?.buffer) {
      // Usar el tipo del body si se está cambiando, sino el del banner existente
      const existing = await Banner.findById(id).lean();
      const type = data.type || existing?.type || "home";
      const buffer = await processBannerImage(req.file.buffer, type);
      data.image = await uploadToR2(buffer, `banners/${uuidv4()}.webp`, "image/webp");
    }
    const updated = await Banner.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ message: "Banner no encontrado" });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Error actualizando banner"});
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    await Banner.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Error eliminando banner"});
  }
};

export const toggleBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findById(id);
    if (!banner) return res.status(404).json({ message: "Banner no encontrado" });
    banner.active = !banner.active;
    await banner.save();
    res.json({ message: "Estado actualizado", banner });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ message: "Error cambiando estado"});
  }
};

export const reorderBanners = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    // Tope: sin esto un array gigante dispara esa cantidad de updates a la vez
    // y agota el pool de conexiones.
    if (!Array.isArray(ids) || ids.length > 500) {
      return res.status(400).json({ message: "Lista de orden inválida o demasiado larga." });
    }
    await Promise.all(
      ids.map((id, idx) => Banner.findByIdAndUpdate(id, { order: idx }))
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Error reordenando"});
  }
};
