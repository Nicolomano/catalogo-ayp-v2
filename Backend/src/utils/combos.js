/**
 * Precio, stock y detalle de los combos.
 *
 * Un combo es un producto armado con otros productos (`componentes` en
 * productModel). Su precio es la **suma de los componentes al precio de hoy**,
 * sin descuento por ser combo: lo que se vende es la comodidad de no buscar
 * pieza por pieza.
 *
 * El precio NO se congela. Se calcula acá cada vez que se muestra o se cotiza,
 * por el mismo motivo que la calculadora del kit (`controllers/kitController.js`):
 * el Excel del contable se importa seguido, y un precio guardado al armar el
 * combo queda viejo sin que nadie se entere.
 *
 * El descuento service del 10% NO se aplica acá. Se devuelve el precio de lista,
 * igual que `priceARS` de cualquier producto, y el descuento lo aplica quien
 * corresponde: el carrito para mostrar y `orderController` para cotizar. Si se
 * aplicara en los dos lados, se descontaría dos veces.
 */
import productModel from "../services/models/productModel.js";

/** Lo que NO es un combo. Para la importación de Excel y los listados. */
export const SOLO_PRODUCTOS = { "componentes.0": { $exists: false } };

/** Lo que sí lo es. */
export const SOLO_COMBOS = { "componentes.0": { $exists: true } };

/** Campos que hacen falta de cada pieza para cotizar y mostrar el combo. */
const CAMPOS_PIEZA = "productCode name priceARS inStock active";

export const esCombo = (doc) =>
  Array.isArray(doc?.componentes) && doc.componentes.length > 0;

/**
 * Completa precio, stock y detalle de los combos que haya en `docs`.
 *
 * Trabaja sobre documentos ya traídos de la base (`.lean()`), los modifica en
 * su lugar y los devuelve. Si no hay ningún combo entre ellos **no consulta
 * nada**: el catálogo normal no paga por esta función.
 *
 * A cada combo le deja:
 *  - `priceARS`           suma de las piezas × cantidad, redondeada
 *  - `inStock`            false si a alguna pieza le falta stock
 *  - `componentesDetalle` qué incluye, con código, para el carrito y el WhatsApp
 *  - `faltan`             qué piezas lo están frenando, para poder decirlo
 *  - `incompleto`         true si una pieza fue borrada o dada de baja
 *
 * Un combo `incompleto` queda **sin stock a propósito**: su precio es la suma de
 * las piezas que quedan, o sea menos de lo que vale, y cotizar de menos en
 * silencio es justamente el error que ya se arregló una vez en el kit.
 */
export async function resolverCombos(docs) {
  const lista = Array.isArray(docs) ? docs : [docs].filter(Boolean);
  const combos = lista.filter(esCombo);
  if (!combos.length) return docs;

  const codigos = [
    ...new Set(
      combos.flatMap((c) => c.componentes.map((x) => String(x.productCode)))
    ),
  ];
  const piezas = await productModel
    .find({ productCode: { $in: codigos } })
    .select(CAMPOS_PIEZA)
    .lean();
  const porCodigo = new Map(piezas.map((p) => [p.productCode, p]));

  for (const combo of combos) {
    let total = 0;
    let hayStock = true;
    let incompleto = false;
    const detalle = [];
    const faltan = [];

    for (const comp of combo.componentes) {
      const codigo = String(comp.productCode);
      const cantidad = Number(comp.quantity) || 1;
      const pieza = porCodigo.get(codigo);

      // Pieza borrada o dada de baja: no se puede cotizar el combo.
      if (!pieza || pieza.active === false) {
        incompleto = true;
        hayStock = false;
        faltan.push(pieza?.name || codigo);
        detalle.push({
          productCode: codigo,
          name: pieza?.name || `Pieza ${codigo} (ya no está)`,
          quantity: cantidad,
          inStock: false,
        });
        continue;
      }

      total += (Number(pieza.priceARS) || 0) * cantidad;
      if (pieza.inStock === false) {
        hayStock = false;
        faltan.push(pieza.name);
      }
      detalle.push({
        productCode: pieza.productCode,
        name: pieza.name,
        quantity: cantidad,
        inStock: pieza.inStock !== false,
      });
    }

    combo.priceARS = Math.round(total);
    combo.inStock = hayStock;
    combo.componentesDetalle = detalle;
    combo.faltan = faltan;
    if (incompleto) combo.incompleto = true;
  }

  return docs;
}

/**
 * Recalcula y GUARDA el precio y el stock de todos los combos.
 *
 * Mostrar y cotizar usan `resolverCombos`, que calcula al vuelo. Pero ordenar y
 * filtrar por precio los hace Mongo, antes de que los documentos lleguen al
 * código: con un `priceARS` viejo, el combo se ordena en el lugar equivocado y
 * el filtro de precio del catálogo lo deja afuera.
 *
 * Por eso el valor también se guarda, y se refresca en los dos únicos momentos
 * en que puede quedar viejo: cuando se guarda el combo desde el panel y al
 * terminar cada importación de Excel. Son pocos combos: es una consulta.
 */
export async function recalcularCombosGuardados() {
  const combos = await productModel
    .find(SOLO_COMBOS)
    .select("componentes priceARS inStock")
    .lean();
  if (!combos.length) return 0;

  await resolverCombos(combos);

  const res = await productModel.bulkWrite(
    combos.map((c) => ({
      updateOne: {
        filter: { _id: c._id },
        update: { $set: { priceARS: c.priceARS, inStock: c.inStock } },
      },
    })),
    { ordered: false }
  );
  return res.modifiedCount || 0;
}
