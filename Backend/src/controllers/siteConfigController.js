import SiteConfig from "../services/models/siteConfigModel.js";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2 } from "../utils/r2.js";

const SINGLETON = { singleton_key: "main" };

export const getConfig = async (req, res) => {
  try {
    let config = await SiteConfig.findOne(SINGLETON).lean();
    if (!config) config = await SiteConfig.create(SINGLETON);
    res.json(config);
  } catch (e) {
    res.status(500).json({ message: "Error obteniendo config", error: e.message });
  }
};

export const updateConfig = async (req, res) => {
  try {
    // Eliminar campos que MongoDB no permite actualizar (_id, __v, timestamps, singleton_key)
    const { _id, __v, createdAt, updatedAt, singleton_key, ...updateData } = req.body;
    const config = await SiteConfig.findOneAndUpdate(
      SINGLETON,
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config);
  } catch (e) {
    res.status(500).json({ message: "Error guardando config", error: e.message });
  }
};

export const uploadHeroImage = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: "No se recibió imagen" });

    const filename = `hero/${uuidv4()}.webp`;
    const buffer = await sharp(req.file.buffer)
      .resize(1500, 600, { fit: "cover", position: "attention" })
      .webp({ quality: 85 })
      .toBuffer();

    const url = await uploadToR2(buffer, filename, "image/webp");

    // Guardar en config
    await SiteConfig.findOneAndUpdate(
      SINGLETON,
      { $set: { heroImage: url } },
      { upsert: true }
    );

    res.json({ url });
  } catch (e) {
    res.status(500).json({ message: "Error subiendo imagen", error: e.message });
  }
};
