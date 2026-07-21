import productModel from "../services/models/productModel.js";
import Config from "../services/models/configModel.js";
import Category from "../services/models/category.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2, deleteFromR2, keyFromUrl } from "../utils/r2.js";
/* ---- búsqueda insensible a tildes ---- */
function toAccentInsensitiveRegex(raw) {
  const map = {
    a: "[aáàâäã]", á: "[aáàâäã]", à: "[aáàâäã]", â: "[aáàâäã]", ä: "[aáàâäã]", ã: "[aáàâäã]",
    e: "[eéèêë]",  é: "[eéèêë]",  è: "[eéèêë]",  ê: "[eéèêë]",  ë: "[eéèêë]",
    i: "[iíìîï]",  í: "[iíìîï]",  ì: "[iíìîï]",  î: "[iíìîï]",  ï: "[iíìîï]",
    o: "[oóòôöõ]", ó: "[oóòôöõ]", ò: "[oóòôöõ]", ô: "[oóòôöõ]", ö: "[oóòôöõ]", õ: "[oóòôöõ]",
    u: "[uúùûü]",  ú: "[uúùûü]",  ù: "[uúùûü]",  û: "[uúùûü]",  ü: "[uúùûü]",
    n: "[nñ]",     ñ: "[nñ]",
  };
  return [...raw.toLowerCase()]
    .map((c) => map[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("");
}

/* ----------------------- CREAR PRODUCTO ----------------------- */
export async function createProduct(req, res) {
  try {
    const { name, description, priceUSD, priceARS, fixedInARS, productCode, brand } =
      req.body;

    // Normalizar arrays
    const categories =
      req.body.categories && !Array.isArray(req.body.categories)
        ? [req.body.categories]
        : req.body.categories || [];

    const subcategories =
      req.body.subcategories && !Array.isArray(req.body.subcategories)
        ? [req.body.subcategories]
        : req.body.subcategories || [];

    let image = null;
    if (req.file?.buffer) {
      const filename = `products/${uuidv4()}.webp`;
      const buffer = await sharp(req.file.buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      image = await uploadToR2(buffer, filename, "image/webp");
    }

    if (!name || !description || !productCode)
      return res.status(400).json({ message: "Faltan campos obligatorios" });

    const fixedFlag = String(fixedInARS).toLowerCase() === "true";

    let priceARSFinal = priceARS ? parseFloat(priceARS) : undefined;
    let priceUSDFinal = priceUSD ? parseFloat(priceUSD) : undefined;

    // Si no está fijo → recalcular ARS según cotización
    if (!fixedFlag && priceUSDFinal) {
      const cfg = await Config.findOne();
      const rate = cfg ? cfg.exchangeRate : 1;
      priceARSFinal = Number(priceUSDFinal) * Number(rate || 1);
    }

    const newProduct = new productModel({
      name,
      description,
      productCode,
      brand: brand?.trim() || null,
      priceUSD: priceUSDFinal,
      priceARS: priceARSFinal,
      fixedInARS: fixedFlag,
      categories,
      subcategories,
      image,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({
      message: "Error creando producto",
      error: error.message,
    });
  }
}

/* ----------------------- SUBIR IMAGEN ----------------------- */
export async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  try {
    const filename = `products/${uuidv4()}.webp`;
    const buffer = await sharp(req.file.buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const imageUrl = await uploadToR2(buffer, filename, "image/webp");
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Error subiendo imagen", error: error.message });
  }
}

/* ----------------------- ACTUALIZAR PRODUCTO ----------------------- */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    const current = await productModel.findById(id).lean();
    if (!current)
      return res.status(404).json({ message: "Producto no encontrado" });

    const fixedFlag =
      req.body.fixedInARS !== undefined
        ? String(req.body.fixedInARS).toLowerCase() === "true"
        : current.fixedInARS;

    // Normalizar arrays
    const categories =
      req.body.categories && !Array.isArray(req.body.categories)
        ? [req.body.categories]
        : req.body.categories || current.categories || [];

    const subcategories =
      req.body.subcategories && !Array.isArray(req.body.subcategories)
        ? [req.body.subcategories]
        : req.body.subcategories || current.subcategories || [];

    const updateData = {
      name: req.body.name ?? current.name,
      description: req.body.description ?? current.description,
      productCode: req.body.productCode ?? current.productCode,
      brand: req.body.brand !== undefined ? (req.body.brand?.trim() || null) : current.brand,
      fixedInARS: fixedFlag,
      categories,
      subcategories,
    };

    if (req.file?.buffer) {
      const filename = `products/${uuidv4()}.webp`;
      const buffer = await sharp(req.file.buffer)
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      updateData.image = await uploadToR2(buffer, filename, "image/webp");
    }

    // Manejo de precios
    const priceUSD = req.body.priceUSD ? Number(req.body.priceUSD) : undefined;
    const priceARS = req.body.priceARS ? Number(req.body.priceARS) : undefined;

    if (!fixedFlag && priceUSD != null) {
      const cfg = await Config.findOne();
      const rate = cfg ? cfg.exchangeRate : 1;
      updateData.priceUSD = priceUSD;
      updateData.priceARS = Number(priceUSD) * Number(rate || 1);
    } else if (fixedFlag) {
      if (priceARS != null) updateData.priceARS = priceARS;
      if (priceUSD != null) updateData.priceUSD = priceUSD;
    }

    const updated = await productModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error actualizando producto:", error);
    res.status(500).json({
      message: "Error actualizando producto",
      error: error.message,
    });
  }
}

/* ----------------------- PRODUCTO POR CÓDIGO (PÚBLICO) ----------------------- */
export async function getProductByCode(req, res) {
  const { productCode } = req.params;
  try {
    const product = await productModel.findOneAndUpdate(
      { productCode: productCode.toString(), active: true },
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!product)
      return res
        .status(404)
        .json({ message: `No se encontró producto con código ${productCode}` });

    res.status(200).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error buscando producto", error: error.message });
  }
}

/* ----------------------- PRODUCTOS POR CATEGORÍA ----------------------- */
export const getProductsByCategory = async (req, res) => {
  try {
    const {
      category,
      subcategory,
      search,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 24,
    } = req.query;

    const brand = req.query.brand
      ? Array.isArray(req.query.brand)
        ? req.query.brand
        : [req.query.brand]
      : [];

    const filter = { active: true };
    // Condiciones que requieren $or propios — se combinarán con $and al final
    const andConditions = [];

    if (category && category !== "all") {
      // Compatibilidad con documentos que aún usan el campo singular "category"
      andConditions.push({
        $or: [
          { categories: { $in: [category] } },
          { category: category },
        ],
      });
    }

    if (subcategory && subcategory !== "all") {
      filter.subcategories = { $in: [subcategory] };
    }

    if (brand.length > 0) {
      filter.brand = { $in: brand };
    }

    if (search) {
      const pattern = toAccentInsensitiveRegex(search.trim());
      andConditions.push({
        $or: [
          { name: { $regex: pattern, $options: "i" } },
          { productCode: { $regex: pattern, $options: "i" } },
        ],
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    if (minPrice || maxPrice) {
      filter.priceARS = {};
      if (minPrice) filter.priceARS.$gte = Number(minPrice);
      if (maxPrice) filter.priceARS.$lte = Number(maxPrice);
    }

    const parsedLimit = Math.max(1, Math.min(100, Number(limit)));
    const skip = (Number(page) - 1) * parsedLimit;
    const sortOption = {};

    if (sort) {
      const [field, order] = sort.split(":");
      sortOption[field] = order === "desc" ? -1 : 1;
    }

    const products = await productModel
      .find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const total = await productModel.countDocuments(filter);

    res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / parsedLimit),
      hasMore: Number(page) * parsedLimit < total,
      products,
    });
  } catch (error) {
    console.error("Error en getProductsByCategory:", error);
    res.status(500).json({
      message: "Error buscando productos",
      error: error.message,
    });
  }
};
/* ----------------------- ELIMINAR PRODUCTO ----------------------- */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const deleted = await productModel.findByIdAndDelete(id);
    if (!deleted)
      return res.status(404).json({ message: "Producto no encontrado" });

    res.status(200).json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando producto:", error);
    res.status(500).json({
      message: "Error eliminando producto",
      error: error.message,
    });
  }
}

/* ----------------------- TOGGLE ACTIVO ----------------------- */
export const toggleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product)
      return res.status(404).json({ message: "Producto no encontrado" });

    product.active = !product.active;
    await product.save();

    res.json({
      message: `Producto ${
        product.active ? "activado" : "desactivado"
      } con éxito`,
      product,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al cambiar estado de producto",
      error: error.message,
    });
  }
};

/* ----------------------- PRODUCTOS (GET) ----------------------- */
export const getProductsAdmin = async (req, res) => {
  try {
    const {
      search = "",
      category,
      subcategory,
      sort,
      active,
      page = 1,
      limit = 0,
    } = req.query;

    const filter = {};

    const adminAnd = [];

    if (search) {
      const pattern = toAccentInsensitiveRegex(search.trim());
      adminAnd.push({
        $or: [
          { name: { $regex: pattern, $options: "i" } },
          { productCode: { $regex: pattern, $options: "i" } },
        ],
      });
    }

    if (category) {
      adminAnd.push({
        $or: [
          { categories: { $in: [category] } },
          { category: category },
        ],
      });
    }

    if (adminAnd.length > 0) filter.$and = adminAnd;

    if (subcategory) filter.subcategories = { $in: [subcategory] };
    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;

    let sortOption = {};
    if (sort) {
      const [field, order] = sort.split(":");
      sortOption[field] = order === "desc" ? -1 : 1;
    } else {
      sortOption = { createdAt: -1 };
    }

    const parsedLimit = Math.max(1, Math.min(100, Number(limit) > 0 ? Number(limit) : 50));
    const parsedPage = Math.max(1, Number(page));
    const skip = (parsedPage - 1) * parsedLimit;

    const [products, total] = await Promise.all([
      productModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      productModel.countDocuments(filter),
    ]);

    res.json({
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      products,
    });
  } catch (error) {
    console.error("Error obteniendo productos (admin):", error);
    res.status(500).json({
      message: "Error obteniendo productos (admin)",
      error: error.message,
    });
  }
};

/* ----------------------- META DE CATEGORÍAS ----------------------- */
export const getCategoriesMeta = async (req, res) => {
  try {
    const onlyActive = req.query.active !== "false";
    const match = onlyActive ? { active: true } : {};

    const docs = await productModel.aggregate([
      { $match: match },
      {
        $project: {
          // Normalizar: si categories está vacío o no existe, intentar con el campo singular "category"
          categories: {
            $cond: {
              if: { $and: [{ $isArray: "$categories" }, { $gt: [{ $size: { $ifNull: ["$categories", []] } }, 0] }] },
              then: "$categories",
              else: {
                $cond: {
                  if: { $and: [{ $ifNull: ["$category", false] }, { $ne: ["$category", ""] }] },
                  then: ["$category"],
                  else: [],
                },
              },
            },
          },
          subcategories: { $ifNull: ["$subcategories", []] },
        },
      },
      { $unwind: "$categories" },
      {
        $group: {
          _id: "$categories",
          subcategories: { $addToSet: "$subcategories" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          subcategories: {
            $reduce: {
              input: "$subcategories",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
        },
      },
      { $sort: { category: 1 } },
    ]);

    res.json(docs);
  } catch (error) {
    console.error("Error obteniendo categorías y subcategorías:", error);
    res.status(500).json({
      message: "Error obteniendo categorías y subcategorías",
      error: error.message,
    });
  }
};

/* ----------------------- PRODUCTOS LANDING ----------------------- */
export const getLandingProducts = async (req, res) => {
  try {
    const [featured, newArrivals] = await Promise.all([
      productModel
        .find({ active: true, featured: true })
        .sort({ featuredOrder: 1, soldCount: -1 })
        .limit(12)
        .lean(),
      productModel
        .find({ active: true })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);
    res.json({ featured, newArrivals });
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo productos landing", error: error.message });
  }
};

/* ----------------------- MARCAS (BRANDS) ----------------------- */
export const getProductBrands = async (req, res) => {
  try {
    const brands = await productModel.distinct("brand", {
      active: true,
      brand: { $exists: true, $ne: null, $ne: "" },
    });
    res.json(brands.filter(Boolean).sort());
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo marcas", error: error.message });
  }
};

/* ----------------------- TOGGLE DESTACADO ----------------------- */
export const toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    // Al destacar, se agrega al final del orden actual de destacados.
    if (!product.featured) {
      product.featuredOrder = await productModel.countDocuments({ featured: true });
    }
    product.featured = !product.featured;
    await product.save();
    res.json({ message: `Producto ${product.featured ? "destacado" : "quitado de destacados"}`, product });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar destacado", error: error.message });
  }
};

/* ----------------------- DESTACADOS (ADMIN) ----------------------- */
// Lista todos los destacados en su orden manual (sin paginar; son pocos).
export const listFeaturedAdmin = async (req, res) => {
  try {
    const featured = await productModel
      .find({ featured: true })
      .sort({ featuredOrder: 1, soldCount: -1 })
      .lean();
    res.json(featured);
  } catch (error) {
    res.status(500).json({ message: "Error obteniendo destacados", error: error.message });
  }
};

// Persiste el orden manual: recibe { ids: [...] } y asigna featuredOrder = índice.
export const reorderFeatured = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    await Promise.all(
      ids.map((id, idx) => productModel.findByIdAndUpdate(id, { featuredOrder: idx }))
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: "Error reordenando destacados", error: error.message });
  }
};

/* ----------------------- TOGGLE STOCK ----------------------- */
export const toggleStock = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });
    product.inStock = !product.inStock;
    await product.save();
    res.json({ message: `Stock ${product.inStock ? "disponible" : "agotado"}`, product });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar stock", error: error.message });
  }
};

/* ──────────────── helpers para parsear el nuevo formato ──────────────── */

/**
 * Parsea un número en formato contable argentino:
 *   "(34,00) $"    → 34        (stock o precio con paréntesis)
 *   "(1.234,56) $" → 1234.56
 *   "14066,3952"   → 14066.3952 (precio_venta con coma decimal)
 *   14066.3952     → 14066.3952 (número nativo JS)
 */
function parseARNumber(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return raw;
  const str = String(raw)
    .replace(/\$/g, "")    // quitar signo $
    .replace(/[()]/g, "")  // quitar paréntesis contables
    .trim()
    .replace(/\./g, "")    // quitar separadores de miles (. en AR)
    .replace(",", ".");    // convertir decimal , → .
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Detecta si una fila pertenece al nuevo formato del sistema contable.
 * Criterio: tiene columna "Codigo_catalogo" o "Codigo_ze" (variantes del sistema contable).
 */
function detectFormat(rows) {
  if (!rows.length) return "unknown";
  const keys = Object.keys(rows[0]);
  if (keys.some((k) => /^Codigo_catalogo$/i.test(k) || /^Codigo_ze$/i.test(k))) return "new";
  if (keys.some((k) => /^C[oó]digo$/.test(k) || k === "productCode")) return "old";
  return "unknown";
}

/* ----------------------- IMPORTAR EXCEL ----------------------- */
export const importProductsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No se recibió archivo" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) return res.json({ message: "Archivo vacío", updated: 0, created: 0, skipped: 0, errors: [] });

    const format = detectFormat(rows);
    if (format === "unknown") {
      return res.status(400).json({
        message: "Formato de Excel no reconocido. Se esperan columnas 'Codigo_catalogo' (sistema contable) o 'Código' (exportación clásica).",
      });
    }

    const cfg = await Config.findOne();
    const exchangeRate = Number(cfg?.exchangeRate || 1);

    let updated = 0, created = 0, skipped = 0;
    const errors = [];

    for (const row of rows) {
      let code, nombre, priceARS, priceUSD, inStock, brandVal, parsedCats, parsedSubs, fixedFlag;

      // ── NUEVO FORMATO del sistema contable (Tango/similar) ──────────────
      // Columnas: Codigo_catalogo | precio_venta | Cotizador | Rubro | SubRubro
      if (format === "new") {
        // productCode: primero Codigo_catalogo, luego Codigo_ze como fallback
        code = String(
          row["Codigo_catalogo"] ?? row["Codigo_catalogo"] ??
          row["Codigo_ze"] ?? row["Codigo_Ze"] ?? row["CODIGO_ZE"] ?? ""
        ).trim();
        if (!code) { skipped++; continue; }

        nombre = String(row["Descripcion"] ?? row["descripcion"] ?? code).trim();

        // Categoría desde Rubro (ignorar "TODOS" = sin categoría)
        const rubro = String(row["Rubro"] ?? row["rubro"] ?? "").trim();
        const subrubro = String(row["SubRubro"] ?? row["Subrubro"] ?? row["subrubro"] ?? "").trim();
        parsedCats = rubro && rubro.toUpperCase() !== "TODOS" ? [rubro] : [];
        parsedSubs = subrubro ? [subrubro] : [];

        // Precio en ARS — intentar múltiples nombres de columna
        priceARS = parseARNumber(
          row["precio_venta"] ?? row["Precio_venta"] ?? row["PRECIO_VENTA"] ??
          row["Precio"] ?? row["precio"] ?? row["PrecioVenta"] ?? row["Precio_Venta"]
        );
        priceUSD = null;
        fixedFlag = priceARS !== null;

        // Stock desde columna Moneda (formato contable: "(1,00) $" → stock=1)
        // También intenta Cotizador / Cotizacion como fallback
        const stockRaw =
          row["Moneda"] ?? row["moneda"] ??
          row["Cotizador"] ?? row["cotizador"] ??
          row["Cotizacion"] ?? row["cotizacion"];
        const stockQty = parseARNumber(stockRaw);
        inStock = stockQty !== null ? stockQty > 0 : true;

        brandVal = null; // el nuevo formato no tiene columna de marca

      // ── FORMATO CLÁSICO (exportación del sistema: Código, Precio (ARS), Stock, Marca, etc.) ──
      } else {
        code = String(row["Código"] ?? row["Codigo"] ?? row["productCode"] ?? "").trim();
        if (!code) { skipped++; continue; }

        nombre = String(row["Nombre"] ?? row["nombre"] ?? row["name"] ?? code).trim();

        const rawARSv = row["Precio (ARS)"];
        const rawUSDv = row["Precio (USD)"];
        const rawStock = row["Stock"];
        const rawBrand = row["Marca"] ?? row["marca"] ?? row["brand"] ?? undefined;

        const rawCats = row["Categorías"] ?? row["Categorias"] ?? row["categories"] ?? undefined;
        const rawSubs = row["Subcategorías"] ?? row["Subcategorias"] ?? row["subcategories"] ?? undefined;

        priceARS = rawARSv !== undefined && rawARSv !== "" ? Number(rawARSv) : null;
        priceUSD = rawUSDv !== undefined && rawUSDv !== "" ? Number(rawUSDv) : null;
        fixedFlag = priceARS !== null && priceUSD === null;
        inStock = rawStock !== undefined
          ? String(rawStock).toLowerCase() !== "no" && rawStock !== 0 && String(rawStock) !== "0"
          : undefined;
        brandVal = rawBrand ? String(rawBrand).trim() || null : undefined;
        parsedCats = rawCats ? String(rawCats).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
        parsedSubs = rawSubs ? String(rawSubs).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
      }

      // ── Guardar en BD ──────────────────────────────────────────────────────────
      const existing = await productModel.findOne({ productCode: code });

      if (existing) {
        const update = {};

        if (format === "new") {
          // Nuevo formato: solo actualizar precio ARS y stock (no tocar categorías existentes si ya las tiene)
          if (priceARS !== null) {
            update.priceARS = Math.round(priceARS);
            update.fixedInARS = true;
          }
          update.inStock = inStock;
          // Actualizar categorías solo si el producto no tiene ninguna aún
          if (parsedCats.length > 0 && (!existing.categories || existing.categories.length === 0)) {
            update.categories = parsedCats;
          }
          if (parsedSubs.length > 0 && (!existing.subcategories || existing.subcategories.length === 0)) {
            update.subcategories = parsedSubs;
          }
        } else {
          // Formato clásico: respetar lógica de fixedInARS
          if (existing.fixedInARS) {
            if (priceARS !== null) update.priceARS = priceARS;
            if (priceUSD !== null) update.priceUSD = priceUSD;
          } else {
            if (priceUSD !== null) {
              update.priceUSD = priceUSD;
              update.priceARS = priceUSD * exchangeRate;
            } else if (priceARS !== null) {
              update.priceARS = priceARS;
            }
          }
          if (inStock !== undefined) update.inStock = inStock;
          if (brandVal !== undefined) update.brand = brandVal;
          if (parsedCats !== undefined) update.categories = parsedCats;
          if (parsedSubs !== undefined) update.subcategories = parsedSubs;
        }

        if (Object.keys(update).length > 0) {
          await productModel.updateOne({ _id: existing._id }, { $set: update });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // ── Producto nuevo ─────────────────────────────────────────────────────
        const newProd = {
          name:          nombre,
          description:   nombre,
          productCode:   code,
          brand:         brandVal ?? null,
          categories:    parsedCats ?? [],
          subcategories: parsedSubs ?? [],
          active:        true,
          inStock:       inStock !== undefined ? inStock : true,
        };

        if (priceARS !== null && !isNaN(priceARS)) {
          newProd.priceARS = Math.round(priceARS);
          if (fixedFlag) newProd.fixedInARS = true;
        }
        if (priceUSD !== null && priceUSD !== undefined && !isNaN(priceUSD)) {
          newProd.priceUSD = priceUSD;
          if (!fixedFlag) newProd.priceARS = priceUSD * exchangeRate;
        }

        try {
          await productModel.create(newProd);
          created++;
        } catch (e) {
          errors.push(`${code}: ${e.message}`);
          skipped++;
        }
      }
    }

    const detectedColumns = rows.length ? Object.keys(rows[0]) : [];
    res.json({
      message: `Importación (${format === "new" ? "nuevo formato" : "formato clásico"}) completada: ${updated} actualizados, ${created} creados, ${skipped} omitidos`,
      format,
      updated,
      created,
      skipped,
      errors: errors.slice(0, 20), // primeros 20 errores
      detectedColumns,
    });
  } catch (error) {
    console.error("Error importando Excel:", error);
    res.status(500).json({ message: "Error importando Excel", error: error.message });
  }
};

export const exportProductsExcel = async (req, res) => {
  try {
    const products = await productModel
      .find(
        {},
        "productCode name brand priceARS priceUSD active categories subcategories"
      )
      .lean();

    const data = products.map((p) => ({
      Código: p.productCode,
      Nombre: p.name,
      Marca: p.brand || "",
      "Precio (ARS)": p.priceARS || "",
      "Precio (USD)": p.priceUSD || "",
      Estado: p.active ? "Activo" : "Inactivo",
      Categorías: Array.isArray(p.categories) ? p.categories.join(", ") : "",
      Subcategorías: Array.isArray(p.subcategories)
        ? p.subcategories.join(", ")
        : "",
    }));

    // Crear hoja y libro
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");

    // Guardar temporalmente
    const tmpDir = path.resolve("./tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    const filePath = path.join(tmpDir, "productos_ayp.xlsx");
    XLSX.writeFile(workbook, filePath);
    // Enviar descarga
    res.download(filePath, "productos_ayp.xlsx", (err) => {
      if (err) {
        console.error("❌ Error enviando archivo Excel:", err);
      }
      fs.unlinkSync(filePath); // eliminar archivo temporal
    });
  } catch (error) {
    console.error("❌ Error exportando Excel:", error);
    res.status(500).json({ message: "Error exportando Excel" });
  }
};

/* ---- MIGRACIÓN: normalizar campo category (string) → categories (array) ---- */
export const migrateCategories = async (req, res) => {
  try {
    // Buscar productos que tienen el campo viejo "category" (string) en MongoDB
    // usando $exists + $type string, y cuyo categories array está vacío
    const candidates = await productModel
      .find({ $and: [{ category: { $exists: true } }, { $or: [{ categories: { $size: 0 } }, { categories: { $exists: false } }] }] })
      .lean();

    let migrated = 0;
    for (const doc of candidates) {
      if (!doc.category) continue;
      await productModel.updateOne(
        { _id: doc._id },
        { $set: { categories: [doc.category] } }
      );
      migrated++;
    }

    res.json({
      message: `Migración completada: ${migrated} productos actualizados`,
      migrated,
    });
  } catch (error) {
    console.error("Error en migración de categorías:", error);
    res.status(500).json({ message: "Error en migración", error: error.message });
  }
};
