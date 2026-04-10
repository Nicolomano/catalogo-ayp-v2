import productModel from "../services/models/productModel.js";
import Config from "../services/models/configModel.js";
import Category from "../services/models/category.js";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2, deleteFromR2, keyFromUrl } from "../utils/r2.js";
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

    if (category && category !== "all") {
      filter.categories = { $in: [category] };
    }

    if (subcategory && subcategory !== "all") {
      filter.subcategories = { $in: [subcategory] };
    }

    if (brand.length > 0) {
      filter.brand = { $in: brand };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { productCode: { $regex: escaped, $options: "i" } },
      ];
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

    if (search) {
      const term = new RegExp(search.trim(), "i");
      filter.$or = [{ name: term }, { productCode: term }];
    }

    if (category) filter.categories = { $in: [category] };
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

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      productModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      productModel.countDocuments(filter),
    ]);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit || 1)),
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
          categories: { $ifNull: ["$categories", []] },
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
        .sort({ soldCount: -1 })
        .limit(8)
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
    product.featured = !product.featured;
    await product.save();
    res.json({ message: `Producto ${product.featured ? "destacado" : "quitado de destacados"}`, product });
  } catch (error) {
    res.status(500).json({ message: "Error al cambiar destacado", error: error.message });
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

/* ----------------------- IMPORTAR EXCEL ----------------------- */
export const importProductsExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No se recibió archivo" });

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const cfg = await Config.findOne();
    const exchangeRate = Number(cfg?.exchangeRate || 1);

    let updated = 0, created = 0, skipped = 0;
    const errors = [];

    for (const row of rows) {
      // Aceptar columnas en español (como las exporta el sistema) o en inglés
      const code = String(
        row["Código"] ?? row["Codigo"] ?? row["productCode"] ?? ""
      ).trim();
      if (!code) { skipped++; continue; }

      const rawARS = row["Precio (ARS)"];
      const rawUSD = row["Precio (USD)"];
      const rawStock = row["Stock"];
      const rawBrand = row["Marca"] ?? row["marca"] ?? row["brand"] ?? undefined;

      const priceARS = rawARS !== undefined && rawARS !== "" ? Number(rawARS) : null;
      const priceUSD = rawUSD !== undefined && rawUSD !== "" ? Number(rawUSD) : null;
      const inStock  = rawStock !== undefined
        ? String(rawStock).toLowerCase() !== "no" && rawStock !== 0 && String(rawStock) !== "0"
        : undefined;

      const existing = await productModel.findOne({ productCode: code });

      if (existing) {
        // ── Producto existente: actualizar SOLO precios e inStock
        // No tocar: active (respetar desactivación manual), name, categories, etc.
        const update = {};

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
        if (rawBrand !== undefined) update.brand = String(rawBrand).trim() || null;

        if (Object.keys(update).length > 0) {
          await productModel.updateOne({ _id: existing._id }, { $set: update });
          updated++;
        } else {
          skipped++;
        }
      } else {
        // ── Producto nuevo: crear con datos mínimos
        const nombre = String(
          row["Nombre"] ?? row["nombre"] ?? row["name"] ?? code
        ).trim();

        const rawBrand = row["Marca"] ?? row["marca"] ?? row["brand"] ?? null;
        const brandVal = rawBrand ? String(rawBrand).trim() : null;

        const newProd = {
          name:        nombre,
          description: nombre,
          productCode: code,
          brand:       brandVal,
          active:      true,
          inStock:     inStock !== undefined ? inStock : true,
        };

        if (priceUSD !== null && !isNaN(priceUSD)) {
          newProd.priceUSD = priceUSD;
          newProd.priceARS = priceUSD * exchangeRate;
        }
        if (priceARS !== null && !isNaN(priceARS)) {
          newProd.priceARS = priceARS;
          if (priceUSD === null) newProd.fixedInARS = true;
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

    res.json({
      message: `Importación completada: ${updated} actualizados, ${created} creados, ${skipped} omitidos`,
      updated,
      created,
      skipped,
      errors,
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
