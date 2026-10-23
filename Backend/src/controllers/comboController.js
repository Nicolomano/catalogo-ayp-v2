/**
 * Combos: productos armados con otros productos.
 *
 * Un combo ES un producto (ver `componentes` en productModel), así que listarlo,
 * buscarlo, borrarlo y activarlo usan lo que ya existe para cualquier producto.
 * Lo único propio es ARMARLO, y es acá donde se valida, en un solo lugar.
 *
 * El precio no se pide ni se acepta: sale de la suma de las piezas (combos.js).
 * Si se pudiera mandar, el combo quedaría con un precio que no es el de sus
 * componentes y volvería el problema que se arregló en la calculadora del kit.
 */
import mongoose from "mongoose";
import productModel from "../services/models/productModel.js";
import { resolverCombos, SOLO_COMBOS, esCombo } from "../utils/combos.js";

/** Un combo con una sola pieza es un producto: no hay nada que combinar. */
const MIN_COMPONENTES = 2;
const MAX_COMPONENTES = 50;
const MAX_CANTIDAD = 999;

/**
 * Valida y normaliza la lista de piezas.
 *
 * Devuelve `{ componentes }` o `{ error }` con un mensaje para mostrar tal cual
 * en el panel: el que lo lee es el dueño, no un programador.
 */
async function validarComponentes(crudos, codigoDelCombo) {
  if (!Array.isArray(crudos) || crudos.length < MIN_COMPONENTES) {
    return { error: `El combo tiene que tener al menos ${MIN_COMPONENTES} productos.` };
  }
  if (crudos.length > MAX_COMPONENTES) {
    return { error: `El combo no puede tener más de ${MAX_COMPONENTES} productos.` };
  }

  const componentes = [];
  const vistos = new Set();

  for (const c of crudos) {
    const productCode = String(c?.productCode ?? "").trim();
    const quantity = Number(c?.quantity ?? 1);

    if (!productCode) return { error: "Hay una pieza sin código." };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CANTIDAD) {
      return { error: `La cantidad de ${productCode} tiene que ser un número entre 1 y ${MAX_CANTIDAD}.` };
    }
    if (productCode === codigoDelCombo) {
      return { error: "Un combo no puede incluirse a sí mismo." };
    }
    if (vistos.has(productCode)) {
      return { error: `El producto ${productCode} está dos veces. Poné la cantidad en una sola línea.` };
    }
    vistos.add(productCode);
    componentes.push({ productCode, quantity });
  }

  // Las piezas tienen que existir, y ninguna puede ser otro combo: un combo
  // adentro de otro haría que el precio dependa de una cadena y que una pieza
  // sin stock se vuelva imposible de rastrear.
  const piezas = await productModel
    .find({ productCode: { $in: [...vistos] } })
    .select("productCode name componentes")
    .lean();
  const porCodigo = new Map(piezas.map((p) => [p.productCode, p]));

  const noExisten = [...vistos].filter((c) => !porCodigo.has(c));
  if (noExisten.length) {
    return { error: `Estos códigos no están en el catálogo: ${noExisten.join(", ")}` };
  }
  const anidados = piezas.filter(esCombo);
  if (anidados.length) {
    return {
      error: `No se puede poner un combo adentro de otro: ${anidados
        .map((p) => p.name)
        .join(", ")}`,
    };
  }

  return { componentes };
}

/** Recalcula y guarda el precio y el stock de UN combo recién tocado. */
async function refrescarPrecio(id) {
  const doc = await productModel.findById(id).select("componentes").lean();
  if (!doc) return null;
  await resolverCombos([doc]);
  await productModel.updateOne(
    { _id: id },
    { $set: { priceARS: doc.priceARS, inStock: doc.inStock } }
  );
  return doc;
}

/* ----------------------- LISTAR (ADMIN) ----------------------- */
export const listarCombos = async (req, res) => {
  try {
    const combos = await productModel
      .find(SOLO_COMBOS)
      .select("productCode name description image active inStock priceARS categories componentes")
      .sort({ createdAt: -1 })
      .lean();

    // Precio y stock de hoy, y el detalle de qué pieza falta: es lo que el panel
    // necesita para mostrar un combo incompleto en rojo.
    await resolverCombos(combos);

    res.json({ combos });
  } catch (error) {
    console.error("Error listando combos:", error);
    res.status(500).json({ message: "Error obteniendo los combos" });
  }
};

/* ----------------------- CREAR ----------------------- */
export const crearCombo = async (req, res) => {
  try {
    const {
      name,
      description,
      productCode,
      image = null,
      categories = [],
      subcategories = [],
      componentes: crudos,
    } = req.body || {};

    const nombre = String(name ?? "").trim();
    const codigo = String(productCode ?? "").trim();
    if (!nombre) return res.status(400).json({ message: "Falta el nombre del combo." });
    if (!codigo) return res.status(400).json({ message: "Falta el código del combo." });

    const yaExiste = await productModel.findOne({ productCode: codigo }).select("_id").lean();
    if (yaExiste) {
      return res.status(409).json({ message: `Ya hay un producto con el código ${codigo}.` });
    }

    const { componentes, error } = await validarComponentes(crudos, codigo);
    if (error) return res.status(400).json({ message: error });

    const combo = await productModel.create({
      name: nombre,
      // La descripción es obligatoria en el modelo; si no la escribió, se usa el
      // nombre, que es mejor que obligarlo a repetirlo.
      description: String(description ?? "").trim() || nombre,
      productCode: codigo,
      image: image || null,
      categories: Array.isArray(categories) ? categories : [],
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      componentes,
      fixedInARS: true, // el precio sale de las piezas, no de la cotización del dólar
      priceARS: 0,      // se completa abajo con la suma real
      active: true,
    });

    await refrescarPrecio(combo._id);
    const creado = await productModel.findById(combo._id).lean();
    await resolverCombos([creado]);

    res.status(201).json({ message: "Combo creado", combo: creado });
  } catch (error) {
    console.error("Error creando combo:", error);
    res.status(500).json({ message: "Error creando el combo" });
  }
};

/* ----------------------- EDITAR ----------------------- */
export const actualizarCombo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Combo inválido." });
    }

    const actual = await productModel.findById(id).select("productCode componentes").lean();
    if (!actual) return res.status(404).json({ message: "No se encontró el combo." });
    if (!esCombo(actual)) {
      // Se exige que ya sea un combo: convertir un producto del contable en
      // combo desde acá sería una forma silenciosa de reescribirle el precio.
      return res.status(400).json({ message: "Ese producto no es un combo." });
    }

    const update = {};
    if (req.body?.name !== undefined) {
      const nombre = String(req.body.name).trim();
      if (!nombre) return res.status(400).json({ message: "El nombre no puede quedar vacío." });
      update.name = nombre;
    }
    if (req.body?.description !== undefined) {
      update.description = String(req.body.description).trim() || update.name || undefined;
    }
    if (req.body?.image !== undefined) update.image = req.body.image || null;
    if (Array.isArray(req.body?.categories)) update.categories = req.body.categories;
    if (Array.isArray(req.body?.subcategories)) update.subcategories = req.body.subcategories;

    if (req.body?.componentes !== undefined) {
      const { componentes, error } = await validarComponentes(
        req.body.componentes,
        actual.productCode
      );
      if (error) return res.status(400).json({ message: error });
      update.componentes = componentes;
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No hay nada para cambiar." });
    }

    await productModel.updateOne({ _id: id }, { $set: update });
    await refrescarPrecio(id);

    const combo = await productModel.findById(id).lean();
    await resolverCombos([combo]);

    res.json({ message: "Combo actualizado", combo });
  } catch (error) {
    console.error("Error actualizando combo:", error);
    res.status(500).json({ message: "Error actualizando el combo" });
  }
};

/* ----------------------- COTIZAR MIENTRAS SE ARMA ----------------------- */
/**
 * Cuánto va a salir el combo con estas piezas, sin guardar nada.
 *
 * Es lo que le permite al panel mostrar el precio en vivo mientras lo arma, y
 * avisar que una pieza está sin stock ANTES de publicarlo.
 */
export const cotizarCombo = async (req, res) => {
  try {
    const { componentes, error } = await validarComponentes(
      req.body?.componentes,
      String(req.body?.productCode ?? "").trim()
    );
    if (error) return res.status(400).json({ message: error });

    const borrador = { componentes };
    await resolverCombos([borrador]);

    res.json({
      priceARS: borrador.priceARS,
      inStock: borrador.inStock,
      componentesDetalle: borrador.componentesDetalle,
      faltan: borrador.faltan,
    });
  } catch (error) {
    console.error("Error cotizando combo:", error);
    res.status(500).json({ message: "No se pudo calcular el combo" });
  }
};
