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
    console.error(e);
    res.status(500).json({ message: "Error obteniendo config"});
  }
};

export const updateConfig = async (req, res) => {
  try {
    // Eliminar campos que MongoDB no permite actualizar (_id, __v, timestamps, singleton_key)
    const { _id, __v, createdAt, updatedAt, singleton_key, ...updateData } = req.body;

    // mapsEmbed va como src de un <iframe> en la página de Contacto: sin
    // restricción se puede embeber cualquier sitio dentro del nuestro (phishing
    // con nuestro dominio en la barra). Solo se aceptan URLs de Google Maps.
    if (updateData.mapsEmbed) {
      const v = String(updateData.mapsEmbed).trim();
      if (v && !/^https:\/\/(www\.)?google\.com\/maps\/embed/i.test(v)) {
        return res.status(400).json({
          message:
            "El mapa tiene que ser una URL de Google Maps (Compartir → Insertar mapa → el src del iframe).",
        });
      }
      updateData.mapsEmbed = v;
    }
    if (updateData.mapsUrl) {
      const v = String(updateData.mapsUrl).trim();
      if (v && !/^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(v)) {
        return res.status(400).json({
          message: "El link de ubicación tiene que ser de Google Maps.",
        });
      }
      updateData.mapsUrl = v;
    }

    const config = await SiteConfig.findOneAndUpdate(
      SINGLETON,
      { $set: updateData },
      { new: true, upsert: true }
    );
    res.json(config);
  } catch (e) {
    console.error("Error en updateConfig:", e);
    res.status(500).json({ message: "Error guardando config"});
  }
};

export const uploadHeroImage = async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: "No se recibió imagen" });

    const filename = `hero/${uuidv4()}.webp`;
    // Guardamos la foto COMPLETA (sin recortar a una tira) para que el encuadre
    // se controle 100% desde el admin con background-position. Solo limitamos el
    // ancho máximo para no subir un archivo gigante.
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 1600, withoutEnlargement: true })
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
    console.error(e);
    res.status(500).json({ message: "Error subiendo imagen"});
  }
};
