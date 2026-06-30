import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import Tecnico from "../services/models/tecnicoModel.js";
import { uploadToR2, deleteFromR2, keyFromUrl } from "../utils/r2.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function processProfilePhoto(buffer) {
  const resized = await sharp(buffer)
    .resize(500, 500, { fit: "cover", position: "attention" })
    .webp({ quality: 85 })
    .toBuffer();
  const key = `tecnicos/fotos/${uuidv4()}.webp`;
  return uploadToR2(resized, key, "image/webp");
}

async function processWorkPhoto(buffer) {
  const resized = await sharp(buffer)
    .resize(800, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const key = `tecnicos/trabajos/${uuidv4()}.webp`;
  return uploadToR2(resized, key, "image/webp");
}

function parseJsonField(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return value; }
}

// ── Public ────────────────────────────────────────────────────────────────────

export async function getTecnicos(req, res) {
  try {
    const { zona, especialidad, page = 1, limit = 6 } = req.query;
    const filter = { active: true };
    if (zona) filter.zone = zona;
    if (especialidad) filter.specialties = especialidad;

    const skip = (Number(page) - 1) * Number(limit);
    const [tecnicos, total] = await Promise.all([
      Tecnico.find(filter)
        .sort({ recommended: -1, order: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Tecnico.countDocuments(filter),
    ]);

    res.json({
      tecnicos,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo técnicos", error: err.message });
  }
}

export async function getTecnicoById(req, res) {
  try {
    const tecnico = await Tecnico.findOne({ _id: req.params.id, active: true }).lean();
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });
    res.json(tecnico);
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo técnico", error: err.message });
  }
}

export async function getZonesAndSpecialties(req, res) {
  try {
    const [zones, specialties] = await Promise.all([
      Tecnico.distinct("zone", { active: true }),
      Tecnico.distinct("specialties", { active: true }),
    ]);
    res.json({ zones: zones.sort(), specialties: specialties.sort() });
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo filtros", error: err.message });
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getTecnicosAdmin(req, res) {
  try {
    const tecnicos = await Tecnico.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json(tecnicos);
  } catch (err) {
    res.status(500).json({ message: "Error obteniendo técnicos", error: err.message });
  }
}

export async function createTecnico(req, res) {
  try {
    const {
      name, title, zone, city, neighborhood,
      bio, yearsExperience, rating, reviewCount,
      whatsapp, recommended, active, order,
    } = req.body;

    const specialties = parseJsonField(req.body.specialties) || [];
    const services    = parseJsonField(req.body.services)    || [];

    let photo = null;
    if (req.file?.buffer) {
      photo = await processProfilePhoto(req.file.buffer);
    }

    const tecnico = new Tecnico({
      name, title, zone, city, neighborhood,
      specialties, bio, services,
      yearsExperience: Number(yearsExperience) || 0,
      rating:          Number(rating)          || 5,
      reviewCount:     Number(reviewCount)     || 0,
      whatsapp, photo,
      recommended: recommended === "true" || recommended === true,
      active:      active      === "false" || active === false ? false : true,
      order:       Number(order) || 0,
    });

    await tecnico.save();
    res.status(201).json(tecnico);
  } catch (err) {
    res.status(500).json({ message: "Error creando técnico", error: err.message });
  }
}

export async function updateTecnico(req, res) {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });

    const {
      name, title, zone, city, neighborhood,
      bio, yearsExperience, rating, reviewCount,
      whatsapp, recommended, active, order,
    } = req.body;

    const specialties = parseJsonField(req.body.specialties);
    const services    = parseJsonField(req.body.services);

    if (name            !== undefined) tecnico.name            = name;
    if (title           !== undefined) tecnico.title           = title;
    if (zone            !== undefined) tecnico.zone            = zone;
    if (city            !== undefined) tecnico.city            = city;
    if (neighborhood    !== undefined) tecnico.neighborhood    = neighborhood;
    if (bio             !== undefined) tecnico.bio             = bio;
    if (whatsapp        !== undefined) tecnico.whatsapp        = whatsapp;
    if (specialties     !== undefined) tecnico.specialties     = specialties;
    if (services        !== undefined) tecnico.services        = services;
    if (yearsExperience !== undefined) tecnico.yearsExperience = Number(yearsExperience);
    if (rating          !== undefined) tecnico.rating          = Number(rating);
    if (reviewCount     !== undefined) tecnico.reviewCount     = Number(reviewCount);
    if (order           !== undefined) tecnico.order           = Number(order);
    if (recommended     !== undefined) tecnico.recommended     = recommended === "true" || recommended === true;
    if (active          !== undefined) tecnico.active          = active !== "false" && active !== false;

    if (req.file?.buffer) {
      const oldKey = keyFromUrl(tecnico.photo);
      if (oldKey) deleteFromR2(oldKey).catch(() => {});
      tecnico.photo = await processProfilePhoto(req.file.buffer);
    }

    await tecnico.save();
    res.json(tecnico);
  } catch (err) {
    res.status(500).json({ message: "Error actualizando técnico", error: err.message });
  }
}

export async function deleteTecnico(req, res) {
  try {
    const tecnico = await Tecnico.findByIdAndDelete(req.params.id);
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });

    const allImages = [
      ...(tecnico.photo ? [tecnico.photo] : []),
      ...(tecnico.recentWork || []),
    ];
    allImages.forEach((url) => {
      const k = keyFromUrl(url);
      if (k) deleteFromR2(k).catch(() => {});
    });

    res.json({ message: "Técnico eliminado" });
  } catch (err) {
    res.status(500).json({ message: "Error eliminando técnico", error: err.message });
  }
}

export async function toggleActive(req, res) {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });
    tecnico.active = !tecnico.active;
    await tecnico.save();
    res.json({ active: tecnico.active });
  } catch (err) {
    res.status(500).json({ message: "Error actualizando técnico", error: err.message });
  }
}

export async function toggleRecommended(req, res) {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });
    tecnico.recommended = !tecnico.recommended;
    await tecnico.save();
    res.json({ recommended: tecnico.recommended });
  } catch (err) {
    res.status(500).json({ message: "Error actualizando técnico", error: err.message });
  }
}

// ── Work gallery ──────────────────────────────────────────────────────────────

export async function addWorkPhoto(req, res) {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: "No se recibió imagen" });

    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });
    if (tecnico.recentWork.length >= 12) {
      return res.status(400).json({ message: "Máximo 12 imágenes en la galería" });
    }

    const url = await processWorkPhoto(req.file.buffer);
    tecnico.recentWork.push(url);
    await tecnico.save();
    res.json({ url, recentWork: tecnico.recentWork });
  } catch (err) {
    res.status(500).json({ message: "Error subiendo imagen", error: err.message });
  }
}

export async function deleteWorkPhoto(req, res) {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) return res.status(404).json({ message: "Técnico no encontrado" });

    const idx = Number(req.params.index);
    if (isNaN(idx) || idx < 0 || idx >= tecnico.recentWork.length) {
      return res.status(400).json({ message: "Índice inválido" });
    }

    const [removed] = tecnico.recentWork.splice(idx, 1);
    const k = keyFromUrl(removed);
    if (k) deleteFromR2(k).catch(() => {});

    await tecnico.save();
    res.json({ recentWork: tecnico.recentWork });
  } catch (err) {
    res.status(500).json({ message: "Error eliminando imagen", error: err.message });
  }
}
