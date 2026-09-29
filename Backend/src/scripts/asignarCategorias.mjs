/**
 * Asigna categorías a los productos que no tienen ninguna, a partir de las
 * palabras de su propio nombre.
 *
 * POR DEFECTO SOLO SIMULA. Muestra el resumen y deja un CSV con el detalle
 * completo para revisar en Excel. Recién con --confirmar escribe en la base.
 *
 *   cd Backend
 *   MONGO_URI="..." node src/scripts/asignarCategorias.mjs
 *   MONGO_URI="..." node src/scripts/asignarCategorias.mjs --categoria "Termostatos"
 *   MONGO_URI="..." node src/scripts/asignarCategorias.mjs --categoria "Termostatos" --confirmar
 *   MONGO_URI="..." node src/scripts/asignarCategorias.mjs --deshacer asignacion-2026-09-21.json
 *
 * Tres cosas que NO hace, a propósito:
 *  - No toca un producto que ya tenga categoría. Lo que asignaste a mano manda.
 *  - No inventa categorías: si la del listado no existe en el panel, avisa y la
 *    saltea. Creala vos primero y volvé a correrlo.
 *  - No borra nada.
 *
 * Cada corrida con --confirmar deja un archivo de registro que permite deshacer
 * exactamente lo que hizo, y solo eso.
 */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

/* ─────────────────────────── Reglas ───────────────────────────
 * EL ORDEN IMPORTA: gana la primera que coincide.
 *
 * Lo específico va antes que lo general, y lo que apenas MENCIONA un gas va
 * antes que la regla de gases: un manómetro para R22 es una herramienta, no un
 * gas. Verificado contra el catálogo real; sin ese orden, "Gases refrigerantes"
 * se llevaba 202 productos de los cuales la mayoría eran manómetros, acoples y
 * o-rings.
 */
const REGLAS = [
  // Familias de electrodoméstico
  ["Microondas",                  /MAGNETRON|MICROONDA/],
  ["Dispensers de agua",          /DISPENSER|PELTIER/],
  ["Termotanques y calefones",    /TERMOTANQUE|CALEFON|\bANODO/],
  /**
   * Secarropas. Las piezas casi nunca dicen "secarropas": se reconocen por el
   * MODELO. Kohinoor 2042/2052/2062, L600/L700, 842/852, 342/352/742/752 y la
   * línea HTS son secarropas; el cable y el fleje de freno son exclusivos del
   * centrífugo (un lavarropas no lleva freno de canasto).
   *
   * El tercer elemento excluye: Kohinoor también fabrica lavarropas (línea
   * Columbia), y un blocapuerta o un lavasecarropas nunca es un secarropas.
   */
  ["Secarropas",
    /(?<!LAVA)SECARROPA|CABLE DE FRENO|FLEJE DE FRENO|KOH-?I-?NOOR.*\b(2042|2052|2062|L600|L700|842|852|342|352|742|752|652|HTS)|\b(2042|2052|2062)\b|CODINI.*ADVANCE|ADVANCE.*CODINI/,
    /COLUMBIA|BLOCAPUERTA|LAVASECARROPA|ECOWASH|AQUA/],
  ["Hornos electricos",           /HORNO|ANAFE|\bPERILLA|QUEMADOR|TERMOCUPLA/],
  ["Rulemanes",                   /RULEMAN|RODAMIENTO/],
  ["Aire acondicionado",          /AIRE ACOND|\bA\/A\b|SPLIT|INVERTER|EVAPORADORA/],
  ["Burletes",                    /BURLETE/],

  // Antes que gases: estos solo nombran el refrigerante con el que sirven
  ["Herramientas",                /\bPINZA|DESTOR|MANOMETRO|MANOVACUOMETRO|MANIFOLD|TESTER|MULTIMETRO|BOMBA DE VACIO|SOPLETE|\bMECHA|TALADRO|ALICATE|CINTA METRICA|EXPANSOR|PESTA[NÑ]ADORA|DOBLADORA|CORTATUBO|BALANZA|TERMOMETRO|VACUOMETRO|ESCALERA|HIDROLAVADORA|DATALOGGER|\bDISCO\b|BOCALLAVE|ACOPLE|ADAPTADOR JERINGA|LLAVE DE ACCESO/],
  ["Filtros",                     /\bFILTRO|FILCAP|FILT\./],
  ["Refrigeración comercial",     /VALVULA|\bVALV\.|RECIBIDOR|TOBERA|SOLENOIDE|\bVISOR\b/],

  // Gases: solo cuando el producto ES el gas
  ["Gases refrigerantes",         /^GAS\b|\bGARRAFA\b|^LATA\b/],

  // Repuestos por tipo
  ["Aceites y lubricantes",       /ACEITE|LUBRICANTE|\bGRASA|SILICONA|REFRIOIL|\b\dGS\b/],
  ["Motocompresores",             /MOTOCOMPRESOR|MOTOC\.|COMPRESOR/],
  ["Unidades condensadoras",      /UNIDAD CONDENSADORA|U\.CONDENSADORA/],
  ["Plaquetas",                   /PLAQUETA|\bPLACA\b|MODULO ELECTRONICO|\bDISPLAY\b/],
  ["Termostatos",                 /TERMOSTAT|COMBISTATO|\bTERMOST\b/],
  ["Resistencias",                /RESISTENCIA|RESITENCIA/],
  ["Lavarropas",                  /LAVARROPA|LAVASECARROPA|BLOCAPUERTA|AMORTIGUADOR|ELECTROVALVULA|SERIGRAFIA|\bRETEN\b|PRESOSTATO|DESAGOTE|\bTAMBOR\b|\bCANASTO\b|\bFUELLE|RESORTE SUSPENSION/],
  ["Motores y Forzadores",        /\bMOTOR|FORZADOR|TURBINA|AGITADOR|\bPOLEA|\bCORREA|VENTILADOR/],
  ["Caños y accesorios de cobre", /\bCANO\b|CANOS|\bCODO|\bTEES?\b|REDUCCION|\bCURVA|TRAMPA DE LIQUIDO|COBRE/],
  ["Accesorios de bronce",        /UNIONES|\bUNION\b|TUERCA|TAPON|ROBINETE|\bNIPLE|RACOR/],
  ["Electricidad",                /CAPACITOR|\bRELAY|RELEVO|CONTACTOR|\bTIMER|\bCABLE|TERMINAL|INTERRUPTOR|PROTECTOR|\bSENSOR|TERMICA|ZAPATILLA|ALARGUE|\bFICHA\b|PORTALAMPARA|TRANSFORMADOR|BORNERA|MICROSWITCH|PULSADOR|TERMOCONTRAIBLE|\bFUSIBLE/],
  ["Autogena y soldaduras",       /SOLDAD|OXIGENO|ACETILEN|ESTA[NÑ]ADO|FUNDENTE|SOLDAR/],
  ["Limpieza",                    /LIMPIA|DESENGRASANTE|DESINCRUSTANTE|ESPUMA/],
  ["Materiales de instalación",   /\bCINTA|MENSULA|PATA DE GOMA|ABRAZADERA|PRECINTO|AISLA|\bSOPORTE|BANDEJA|MANGUERA|FLEXIBLE|TORNILLO|ARANDELA|\bBULON|VARILLA ROSCADA/],
];

const normalizar = (s) =>
  (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const categoriaPara = (nombre) => {
  const n = normalizar(nombre);
  // Tercer elemento opcional: lo que NO cuenta aunque la regla coincida. Hace
  // falta cuando una marca fabrica dos cosas distintas (Kohinoor hace
  // secarropas y también lavarropas de la línea Columbia).
  const r = REGLAS.find(([, incluye, excluye]) => incluye.test(n) && !(excluye && excluye.test(n)));
  return r ? r[0] : null;
};

/* ─────────────────────────── Argumentos ─────────────────────────── */

const args = process.argv.slice(2);
const flag = (nombre) => args.includes(nombre);
const valor = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : null;
};

const CONFIRMAR = flag("--confirmar");
const SOLO = valor("--categoria");
const DESHACER = valor("--deshacer");
const LIMITE = Number(valor("--limite")) || 0;

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  mal: (s) => `\x1b[31m${s}\x1b[0m`,
  avi: (s) => `\x1b[33m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error(c.mal("\nFalta MONGO_URI.\n"));
  console.error('  MONGO_URI="mongodb+srv://..." node src/scripts/asignarCategorias.mjs\n');
  process.exit(1);
}

/* ─────────────────────────── Proceso ─────────────────────────── */

await mongoose.connect(MONGO_URI);
const productModel = (await import("../services/models/productModel.js")).default;
const Category = (await import("../services/models/category.js")).default;

// Con la fecha sola, dos corridas el mismo día pisaban el archivo de registro y
// la primera quedaba sin forma de deshacerse. Lleva hora y minuto.
const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const carpeta = path.resolve("./");

if (DESHACER) {
  await deshacer();
} else {
  await asignar();
}

await mongoose.disconnect();

/* ─────────────────────────── Asignar ─────────────────────────── */

async function asignar() {
  // Solo categorías raíz que existan de verdad en el panel: el script no inventa
  // ninguna, porque una categoría que no está creada no se ve en el catálogo.
  const delPanel = await Category.find({ parent: null }).select("name").lean();
  const existentes = new Set(delPanel.map((x) => x.name));

  const faltantes = [...new Set(REGLAS.map(([n]) => n))].filter((n) => !existentes.has(n));
  if (faltantes.length) {
    console.log(c.avi(`\n⚠ Estas categorías del listado NO existen en el panel y se saltean:`));
    faltantes.forEach((f) => console.log(c.avi(`     ${f}`)));
    console.log(c.gris("  Crealas en Panel → Categorías y volvé a correr el script.\n"));
  }

  // "Sin categoría" = ni el campo nuevo ni el viejo tienen nada.
  const sinCategoria = await productModel
    .find({
      $and: [
        { $or: [{ categories: { $exists: false } }, { categories: { $size: 0 } }] },
        { $or: [{ category: { $exists: false } }, { category: "" }, { category: null }] },
      ],
    })
    .select("productCode name categories")
    .lean();

  console.log(`\n${sinCategoria.length} productos sin categoría\n`);

  const plan = [];
  for (const p of sinCategoria) {
    const cat = categoriaPara(p.name);
    if (!cat) continue;
    if (!existentes.has(cat)) continue;
    if (SOLO && cat !== SOLO) continue;
    plan.push({ _id: p._id, productCode: p.productCode, name: p.name, categoria: cat });
    if (LIMITE && plan.length >= LIMITE) break;
  }

  if (SOLO && !existentes.has(SOLO)) {
    console.log(c.mal(`La categoría "${SOLO}" no existe en el panel.\n`));
    return;
  }
  if (!plan.length) {
    console.log(c.avi("No hay nada para asignar con esos criterios.\n"));
    return;
  }

  const porCat = new Map();
  for (const x of plan) porCat.set(x.categoria, (porCat.get(x.categoria) || 0) + 1);
  console.log("  productos  categoría");
  for (const [cat, n] of [...porCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(9)}  ${cat}`);
  }
  console.log(`\n  total a asignar: ${plan.length}`);

  // El detalle completo va a un CSV: 1600 líneas en la terminal no se revisan.
  const csv = [
    "codigo,nombre,categoria_propuesta",
    ...plan.map((x) =>
      [x.productCode, x.name, x.categoria]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\r\n");
  const archivoCsv = path.join(carpeta, `asignacion-${sello}.csv`);
  fs.writeFileSync(archivoCsv, "﻿" + csv);
  console.log(c.gris(`  detalle para revisar: ${archivoCsv}`));

  if (!CONFIRMAR) {
    console.log(c.avi("\n  SIMULACIÓN: no se escribió nada."));
    console.log(c.gris("  Revisá el CSV y, si está bien, repetí el comando agregando --confirmar\n"));
    return;
  }

  const res = await productModel.bulkWrite(
    plan.map((x) => ({
      updateOne: { filter: { _id: x._id }, update: { $set: { categories: [x.categoria] } } },
    })),
    { ordered: false }
  );

  // Registro para poder deshacer exactamente esto y nada más.
  const archivoLog = path.join(carpeta, `asignacion-${sello}.json`);
  fs.writeFileSync(
    archivoLog,
    JSON.stringify(
      { fecha: new Date().toISOString(), cantidad: plan.length,
        cambios: plan.map((x) => ({ id: String(x._id), categoria: x.categoria })) },
      null, 2
    )
  );

  console.log(c.ok(`\n  ✔ ${res.modifiedCount} productos asignados.`));
  console.log(c.gris(`  registro para deshacer: ${archivoLog}`));
  console.log(c.gris("  El catálogo tarda hasta 5 minutos en mostrar los cambios (caché).\n"));
}

/* ─────────────────────────── Deshacer ─────────────────────────── */

async function deshacer() {
  if (!fs.existsSync(DESHACER)) {
    console.error(c.mal(`\nNo encuentro el archivo ${DESHACER}\n`));
    return;
  }
  const log = JSON.parse(fs.readFileSync(DESHACER, "utf8"));
  console.log(`\nDeshaciendo la corrida del ${log.fecha?.slice(0, 10)} — ${log.cantidad} productos\n`);

  // Se vacía SOLO si la categoría sigue siendo exactamente la que puso el
  // script. Si después la cambiaste a mano, ese producto no se toca.
  const ops = log.cambios.map((x) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(x.id), categories: [x.categoria] },
      update: { $set: { categories: [] } },
    },
  }));

  if (!CONFIRMAR) {
    let coinciden = 0;
    for (const x of log.cambios) {
      const p = await productModel.findOne({
        _id: new mongoose.Types.ObjectId(x.id), categories: [x.categoria],
      }).select("_id").lean();
      if (p) coinciden++;
    }
    console.log(`  se revertirían ${coinciden} de ${log.cambios.length}`);
    console.log(c.gris(`  (los otros ${log.cambios.length - coinciden} se editaron después y no se tocan)`));
    console.log(c.avi("\n  SIMULACIÓN: no se escribió nada. Agregá --confirmar para aplicar.\n"));
    return;
  }

  const res = await productModel.bulkWrite(ops, { ordered: false });
  console.log(c.ok(`  ✔ ${res.modifiedCount} productos volvieron a quedar sin categoría.\n`));
}
