/**
 * Corrige marcas mal escritas en los nombres de los productos.
 *
 * El problema, medido en producción: Whirlpool está cargada de las dos formas
 * —39 productos bien escritos y 33 como WHIRPOOL, sin la L—. El técnico que
 * escribe la marca bien ve la mitad del stock. Ningún corrector arregla esto:
 * las dos formas existen y las dos devuelven resultados.
 *
 * POR DEFECTO SOLO SIMULA. Muestra el resumen y deja un CSV con el antes y el
 * después de cada nombre para revisar en Excel. Recién con --confirmar escribe.
 *
 *   cd Backend
 *   MONGO_URI="..." node src/scripts/corregirMarcas.mjs
 *   MONGO_URI="..." node src/scripts/corregirMarcas.mjs --marca Whirlpool
 *   MONGO_URI="..." node src/scripts/corregirMarcas.mjs --marca Whirlpool --confirmar
 *   MONGO_URI="..." node src/scripts/corregirMarcas.mjs --deshacer marcas-2026-10-23-14-30.json
 *
 * Es permanente: se verificó que la importación de Excel (`buildUpdate()` en
 * productsController.js) toca precio, stock y categorías, pero NUNCA el nombre.
 * Así que el próximo listado del contable no va a volver a escribirlo mal... en
 * los productos que ya existen. Para los que entren nuevos mal escritos está la
 * red de seguridad de los alias en utils/busqueda.js, y se puede volver a
 * correr esto.
 *
 * Qué NO hace, a propósito:
 *  - No toca nada que no sea la palabra de la marca: el resto del nombre queda
 *    carácter por carácter como estaba.
 *  - No cambia precios, stock, categorías ni códigos.
 *  - No borra nada.
 *
 * Cada corrida con --confirmar deja un registro para deshacer exactamente lo
 * que hizo, y solo eso.
 */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

/* ─────────────────────────── Las marcas ───────────────────────────
 * Primero la forma correcta, después las formas mal escritas que están en el
 * catálogo. Salieron de contar las marcas reales, no de suponer.
 *
 * Se compara con límites de palabra, así que corregir DANFOS no toca DANFOSS.
 */
const MARCAS = [
  ["Whirlpool", ["WHIRPOOL", "WHIRPOLL", "WHILPOOL", "WIRLPOOL"]],
  ["Tecumseh", ["TECUMSHE", "TECUNSEH"]],
  ["Kohinoor", ["KOHINOR"]],
  ["Danfoss", ["DANFOS"]],
];

/* ─────────────────────────── Argumentos ─────────────────────────── */

const args = process.argv.slice(2);
const flag = (nombre) => args.includes(nombre);
const valor = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : null;
};

const CONFIRMAR = flag("--confirmar");
const SOLO = valor("--marca");
const DESHACER = valor("--deshacer");

const c = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  mal: (s) => `\x1b[31m${s}\x1b[0m`,
  avi: (s) => `\x1b[33m${s}\x1b[0m`,
  gris: (s) => `\x1b[90m${s}\x1b[0m`,
};

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error(c.mal("\nFalta MONGO_URI.\n"));
  console.error('  MONGO_URI="mongodb+srv://..." node src/scripts/corregirMarcas.mjs\n');
  process.exit(1);
}

/* ─────────────────────────── Herramientas ─────────────────────────── */

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * La forma correcta, escrita con las mayúsculas del texto que se reemplaza.
 *
 * Los nombres del contable están casi todos en MAYÚSCULAS, pero algunos no, y
 * cambiarle el estilo al nombre entero sería un cambio que nadie pidió.
 */
function conElMismoEstilo(correcta, encontrada) {
  if (encontrada === encontrada.toUpperCase()) return correcta.toUpperCase();
  if (encontrada === encontrada.toLowerCase()) return correcta.toLowerCase();
  return correcta;
}

/** El nombre corregido, o null si no había nada que corregir. */
function corregir(texto, correcta, malas) {
  let salida = texto;
  for (const mala of malas) {
    const re = new RegExp(`\\b${escapar(mala)}\\b`, "gi");
    salida = salida.replace(re, (m) => conElMismoEstilo(correcta, m));
  }
  return salida === texto ? null : salida;
}

/* ─────────────────────────── Proceso ─────────────────────────── */

await mongoose.connect(MONGO_URI);
const productModel = (await import("../services/models/productModel.js")).default;

// Con la fecha sola, dos corridas el mismo día pisaban el registro y la primera
// quedaba sin forma de deshacerse. Lleva hora y minuto.
const sello = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const carpeta = path.resolve("./");

if (DESHACER) {
  await deshacer();
} else {
  await corregirTodo();
}

await mongoose.disconnect();

/* ─────────────────────────── Corregir ─────────────────────────── */

async function corregirTodo() {
  const aTrabajar = SOLO
    ? MARCAS.filter(([correcta]) => correcta.toLowerCase() === SOLO.toLowerCase())
    : MARCAS;

  if (!aTrabajar.length) {
    console.error(c.mal(`\nNo tengo reglas para la marca "${SOLO}".`));
    console.error(c.gris(`  Las que conozco: ${MARCAS.map((m) => m[0]).join(", ")}\n`));
    return;
  }

  const cambios = [];
  const resumen = new Map();

  for (const [correcta, malas] of aTrabajar) {
    // Se traen solo los productos que tienen alguna de las formas mal escritas,
    // en el nombre o en la marca.
    const patron = malas.map((m) => `\\b${escapar(m)}\\b`).join("|");
    const re = { $regex: patron, $options: "i" };
    const docs = await productModel
      .find({ $or: [{ name: re }, { brand: re }] })
      .select("name brand productCode")
      .lean();

    for (const p of docs) {
      for (const campo of ["name", "brand"]) {
        const antes = p[campo];
        if (!antes) continue;
        const despues = corregir(antes, correcta, malas);
        if (!despues) continue;
        cambios.push({
          id: String(p._id),
          codigo: p.productCode,
          marca: correcta,
          campo,
          antes,
          despues,
        });
        resumen.set(correcta, (resumen.get(correcta) || 0) + 1);
      }
    }
  }

  console.log(`\n${CONFIRMAR ? "Corrigiendo" : "Simulando"} marcas mal escritas\n`);

  if (!cambios.length) {
    console.log(c.ok("  No hay nada que corregir: todas las marcas están bien escritas.\n"));
    return;
  }

  for (const [marca, cuantos] of [...resumen].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${marca.padEnd(14)} ${String(cuantos).padStart(4)} correcciones`);
  }
  console.log(c.gris(`\n  ${cambios.length} cambios en total`));

  // El detalle va a un CSV: el antes y el después de cada nombre, para poder
  // revisarlo en Excel antes de escribir nada.
  const csv = [
    "codigo,marca,campo,antes,despues",
    ...cambios.map((x) =>
      [x.codigo, x.marca, x.campo, x.antes, x.despues]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\r\n");
  const archivoCsv = path.join(carpeta, `marcas-${sello}.csv`);
  fs.writeFileSync(archivoCsv, "﻿" + csv);
  console.log(c.gris(`  detalle: ${archivoCsv}`));

  if (!CONFIRMAR) {
    console.log(c.avi("\n  SIMULACIÓN: no se escribió nada."));
    console.log(c.gris("  Revisá el CSV y, si está bien, repetí el comando agregando --confirmar\n"));
    return;
  }

  // Se escribe solo si el valor sigue siendo exactamente el que se leyó: si
  // alguien lo editó mientras corría esto, ese producto no se toca.
  const res = await productModel.bulkWrite(
    cambios.map((x) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(x.id), [x.campo]: x.antes },
        update: { $set: { [x.campo]: x.despues } },
      },
    })),
    { ordered: false }
  );

  const archivoLog = path.join(carpeta, `marcas-${sello}.json`);
  fs.writeFileSync(
    archivoLog,
    JSON.stringify({ fecha: new Date().toISOString(), cantidad: cambios.length, cambios }, null, 2)
  );

  console.log(c.ok(`\n  ✔ ${res.modifiedCount} campos corregidos.`));
  console.log(c.gris(`  registro para deshacer: ${archivoLog}\n`));
}

/* ─────────────────────────── Deshacer ─────────────────────────── */

async function deshacer() {
  if (!fs.existsSync(DESHACER)) {
    console.error(c.mal(`\nNo encuentro el archivo ${DESHACER}\n`));
    return;
  }
  const log = JSON.parse(fs.readFileSync(DESHACER, "utf8"));
  console.log(`\nDeshaciendo la corrida del ${log.fecha?.slice(0, 10)} — ${log.cantidad} cambios\n`);

  // Se revierte SOLO si el valor sigue siendo exactamente el que escribió el
  // script. Si después lo cambiaste a mano, ese producto no se toca.
  const ops = log.cambios.map((x) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(x.id), [x.campo]: x.despues },
      update: { $set: { [x.campo]: x.antes } },
    },
  }));

  if (!CONFIRMAR) {
    let coinciden = 0;
    for (const x of log.cambios) {
      const p = await productModel
        .findOne({ _id: new mongoose.Types.ObjectId(x.id), [x.campo]: x.despues })
        .select("_id")
        .lean();
      if (p) coinciden++;
    }
    console.log(`  se revertirían ${coinciden} de ${log.cambios.length}`);
    console.log(c.gris(`  (los otros ${log.cambios.length - coinciden} se editaron después y no se tocan)`));
    console.log(c.avi("\n  SIMULACIÓN: no se escribió nada. Agregá --confirmar para aplicar.\n"));
    return;
  }

  const res = await productModel.bulkWrite(ops, { ordered: false });
  console.log(c.ok(`  ✔ ${res.modifiedCount} campos volvieron a su valor anterior.\n`));
}
