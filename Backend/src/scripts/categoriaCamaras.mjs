/**
 * Crea la categoría "Cámaras frigoríficas" con sus subcategorías y le asigna
 * los productos de cámara, que hoy están sin categoría o desparramados.
 *
 * POR DEFECTO SOLO SIMULA: muestra qué haría producto por producto. Recién con
 * --confirmar escribe en la base.
 *
 *   cd Backend
 *   MONGO_URI="..." node src/scripts/categoriaCamaras.mjs
 *   MONGO_URI="..." node src/scripts/categoriaCamaras.mjs --confirmar
 *   MONGO_URI="..." node src/scripts/categoriaCamaras.mjs --deshacer camaras-2026-11-10-15-30-00.json --confirmar
 *
 * Va por CÓDIGO y no por palabras del nombre: son pocos productos y así lo que
 * se asigna es exactamente lo que se revisó. Los códigos salen del catálogo
 * publicado del 10/11/2026.
 *
 * Qué hace con cada producto:
 *  - Sin categoría → pasa a Cámaras frigoríficas con su subcategoría.
 *  - Los tableros A&P de cámara SUMAN la categoría: siguen también en
 *    Electricidad → Tableros, donde los busca el que viene por un tablero.
 *  - La cenefa de 100 mm se MUEVE desde Refrigeración comercial → Accesorios
 *    cámara frigorífica, que queda vacía y se puede borrar desde el panel.
 *
 * Cada corrida con --confirmar deja un registro con cómo estaba cada producto,
 * para poder volver atrás exactamente eso.
 */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const CATEGORIA = "Cámaras frigoríficas";

/** subcategoría → códigos. "sumar": se agrega sin sacarle la categoría que ya tiene. */
const PLAN = [
  { sub: "Paneles y perfiles", slug: "camaras-paneles", codigos: [
    "10102068", // PANEL POLIURETANO 60MM
    "10102069", // PANEL POLIURETANO 100MM
    "10102059", // CENEFA PARA PANEL DE 50/60MM
    "10102064", // CENEFA PARA PANEL DE 100MM (estaba en Refrigeración comercial)
    "10102060", // CHAPA EN U 50 X 50
    "10102061", // CHAPA EN U 100 X 100
    "10102063", // CHAPA EN U 60 X 60
    "10102065", // ANGULO REFORZADO 60 X 60
    "10102066", // ESQUINERO 45 X 45
  ] },
  { sub: "Puertas y herrajes", slug: "camaras-puertas", codigos: [
    "10402248", // MANIJA DE CAMARA INTERIOR
    "10402252", // ENGANCHE EXTERIOR DE CAMARA
    "10402705", // MANIJA EXTERIOR JUNTA-1220
    "10402706", // MANIJA EXTERIOR SEPARADA
    "10402590", // CIERRE L 1810 S/LLAVE
  ] },
  { sub: "Cortinas", slug: "camaras-cortinas", codigos: [
    "11000985", // CORTINA CRISTAL 200mm
    "11000986", // SOPORTE 986mm (de la cortina)
  ] },
  { sub: "Evaporadores", slug: "camaras-evaporadores", codigos: [
    "11600737", // EVAPORADOR CUBICO 2 HP
    "11600740", // EVAP. CUBICO 3HP
    "11600743", // EVAP. CUBICO 5HP
    "11600770", // EVAP. BAJA SIL. 1.5HP
    "11600773", // EVAP. BAJA SIL. 2 HP
  ] },
  { sub: "Tableros y controladores", slug: "camaras-tableros", sumar: true, codigos: [
    "10101479", // TABLERO A&P SEMI CAMARA /BATEA
    "10101480", // TABLERO A&P CAMARA MEDIA TEMP 220V
    "10101481", // TABLERO A&P CAMARA BAJA TEMP 220V
    "10101482", // TABLERO A&P CAMARA MEDIA TEMP 380V
    "10101483", // TABLERO A&P CAMARA BAJA TEMP 380V
    "11000601", // CONTROLADOR ENFRIADOR 1 SALIDA
    "11000693", // CONTROLADOR /DEFROST /1SONDA
    "11700453", // CONTROLADOR DE TEMPERATURA Y HUMEDAD
  ] },
];

/** De dónde sale la cenefa: esta subcategoría deja de usarse. */
const SUB_VIEJA = "Accesorios cámara frigorífica";

/* ─────────────────────────── Argumentos ─────────────────────────── */

const args = process.argv.slice(2);
const CONFIRMAR = args.includes("--confirmar");
const i = args.indexOf("--deshacer");
const DESHACER = i >= 0 ? args[i + 1] : null;

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  mal: (s) => `\x1b[31m${s}\x1b[0m`,
  avi: (s) => `\x1b[33m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error(c.mal("\nFalta MONGO_URI.\n"));
  console.error('  MONGO_URI="mongodb+srv://..." node src/scripts/categoriaCamaras.mjs\n');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
const productModel = (await import("../services/models/productModel.js")).default;
const Category = (await import("../services/models/category.js")).default;

if (DESHACER) await deshacer();
else await asignar();

await mongoose.disconnect();

/* ─────────────────────────── Asignar ─────────────────────────── */

/** Cómo queda un producto. Devuelve null si ya está como tiene que estar. */
function destino(p, { sub, sumar }) {
  const cats = p.categories || [];
  const subs = p.subcategories || [];
  let categories, subcategories;
  if (sumar) {
    categories = cats.includes(CATEGORIA) ? cats : [...cats, CATEGORIA];
    subcategories = subs.includes(sub) ? subs : [...subs, sub];
  } else {
    categories = [CATEGORIA];
    subcategories = [sub];
  }
  const igual = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
  return igual(categories, cats) && igual(subcategories, subs) ? null : { categories, subcategories };
}

async function asignar() {
  const codigos = PLAN.flatMap((g) => g.codigos);
  const productos = await productModel
    .find({ productCode: { $in: codigos } })
    .select("productCode name categories subcategories")
    .lean();
  const porCodigo = new Map(productos.map((p) => [p.productCode, p]));

  const cambios = [];
  for (const grupo of PLAN) {
    console.log(`\n${CATEGORIA} → ${grupo.sub}${grupo.sumar ? c.gris("  (se suma, no saca la que tiene)") : ""}`);
    for (const codigo of grupo.codigos) {
      const p = porCodigo.get(codigo);
      if (!p) {
        console.log(c.avi(`  ${codigo}  no existe en la base: se saltea`));
        continue;
      }
      const nuevo = destino(p, grupo);
      const antes = (p.categories || []).join(", ") || "sin categoría";
      if (!nuevo) {
        console.log(c.gris(`  ${codigo}  ${p.name}  (ya está)`));
        continue;
      }
      console.log(`  ${codigo}  ${p.name}  ${c.gris(`— antes: ${antes}`)}`);
      cambios.push({
        id: String(p._id),
        antes: { categories: p.categories || [], subcategories: p.subcategories || [] },
        despues: nuevo,
      });
    }
  }

  const raiz = await Category.findOne({ name: CATEGORIA, parent: null }).lean();
  const subsExistentes = raiz
    ? new Set((await Category.find({ parent: raiz._id }).select("name").lean()).map((x) => x.name))
    : new Set();
  const subsACrear = PLAN.filter((g) => !subsExistentes.has(g.sub));

  console.log(`\n  productos a cambiar: ${cambios.length}`);
  if (!raiz) console.log(`  categoría a crear: ${CATEGORIA}`);
  if (subsACrear.length) console.log(`  subcategorías a crear: ${subsACrear.map((g) => g.sub).join(", ")}`);

  if (!cambios.length && !subsACrear.length && raiz) {
    console.log(c.ok("\n  Ya está todo como tiene que estar: no hay nada que hacer.\n"));
    return;
  }
  if (!CONFIRMAR) {
    console.log(c.avi("\n  SIMULACIÓN: no se escribió nada. Si está bien, repetí agregando --confirmar\n"));
    return;
  }

  // Primero las categorías: un producto con una categoría que no existe en el
  // panel no aparece en el menú del catálogo.
  const creadas = [];
  let padre = raiz;
  if (!padre) {
    padre = await new Category({ name: CATEGORIA, slug: "camaras-frigorificas", parent: null }).save();
    creadas.push(String(padre._id));
  }
  for (const g of subsACrear) {
    const sub = await new Category({ name: g.sub, slug: g.slug, parent: padre._id }).save();
    creadas.push(String(sub._id));
  }

  const res = cambios.length
    ? await productModel.bulkWrite(
        cambios.map((x) => ({
          updateOne: { filter: { _id: x.id }, update: { $set: x.despues } },
        })),
        { ordered: false }
      )
    : { modifiedCount: 0 };

  // Con segundos: dos corridas en el mismo minuto no se pisan el registro.
  const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const archivo = path.resolve(`camaras-${sello}.json`);
  fs.writeFileSync(
    archivo,
    JSON.stringify({ fecha: new Date().toISOString(), categoriasCreadas: creadas, cambios }, null, 2)
  );

  console.log(c.ok(`\n  ✔ ${res.modifiedCount} productos asignados, ${creadas.length} categorías creadas.`));
  console.log(c.gris(`  registro para deshacer: ${archivo}`));

  const quedan = await productModel.countDocuments({ subcategories: SUB_VIEJA });
  if (quedan === 0) {
    console.log(c.gris(`  "${SUB_VIEJA}" (en Refrigeración comercial) quedó vacía: se puede borrar desde el panel.`));
  }
  console.log(c.gris("  El catálogo tarda hasta 5 minutos en mostrar los cambios (caché).\n"));
}

/* ─────────────────────────── Deshacer ─────────────────────────── */

async function deshacer() {
  if (!fs.existsSync(DESHACER)) {
    console.error(c.mal(`\nNo encuentro el archivo ${DESHACER}\n`));
    return;
  }
  const log = JSON.parse(fs.readFileSync(DESHACER, "utf8"));

  // Solo vuelve atrás los productos que siguen exactamente como los dejó el
  // script: si después alguien los cambió a mano, manda lo de la mano.
  const ops = log.cambios.map((x) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(x.id), ...x.despues },
      update: { $set: x.antes },
    },
  }));

  if (!CONFIRMAR) {
    let coinciden = 0;
    for (const op of ops) if (await productModel.exists(op.updateOne.filter)) coinciden++;
    console.log(`\n  se volverían atrás ${coinciden} de ${ops.length} productos`);
    console.log(`  y se borrarían ${log.categoriasCreadas.length} categorías creadas (si nadie las usa)`);
    console.log(c.avi("\n  SIMULACIÓN: no se escribió nada. Agregá --confirmar para aplicar.\n"));
    return;
  }

  const res = ops.length ? await productModel.bulkWrite(ops, { ordered: false }) : { modifiedCount: 0 };

  let borradas = 0;
  const raiz = await Category.findOne({ name: CATEGORIA, parent: null }).lean();
  const enUso = raiz ? await productModel.exists({ categories: CATEGORIA }) : null;
  if (!enUso) {
    // De abajo hacia arriba: primero las subcategorías, después la raíz.
    const ids = [...log.categoriasCreadas].reverse();
    borradas = (await Category.deleteMany({ _id: { $in: ids } })).deletedCount;
  }

  console.log(c.ok(`\n  ✔ ${res.modifiedCount} productos volvieron a como estaban, ${borradas} categorías borradas.\n`));
  if (enUso) console.log(c.avi("  La categoría no se borró: todavía hay productos que la usan.\n"));
}
