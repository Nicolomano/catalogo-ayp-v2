/**
 * Prueba el script que corrige las marcas mal escritas, corriéndolo DE VERDAD
 * como proceso aparte contra una base en memoria descartable.
 *
 * Lo que importa verificar, porque el script escribe en la base de producción:
 *  - que simulando no escriba NADA;
 *  - que al confirmar cambie solo la palabra de la marca y nada más del nombre;
 *  - que no toque lo que ya estaba bien escrito (DANFOSS no es DANFOS);
 *  - que deshacer revierta exactamente esa corrida, y no lo que se editó después.
 *
 * No forma parte del build (ver la nota en __test-recuperacion.mjs):
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-marcas.mjs
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

process.env.JWT_SECRET ||= "secreto-solo-para-esta-prueba-descartable";

const ok = [];
const fallos = [];

async function check(nombre, fn) {
  try {
    const detalle = await fn();
    ok.push(nombre);
    console.log(`  ✔ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  } catch (e) {
    fallos.push(`${nombre}: ${e.message}`);
    console.log(`  ✘ ${nombre}\n      ${e.message}`);
  }
}
const esperar = (real, esp, que) => {
  if (real !== esp) throw new Error(`${que}: ${real}, se esperaba ${esp}`);
};

const SCRIPT = fileURLToPath(new URL("./corregirMarcas.mjs", import.meta.url));
// Los CSV y los registros se escriben en el directorio desde el que se corre:
// una carpeta aparte y descartable, para no ensuciar el repositorio.
const trabajo = fs.mkdtempSync(path.join(os.tmpdir(), "marcas-"));

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
await mongoose.connect(process.env.MONGO_URI);

const productModel = (await import("../services/models/productModel.js")).default;

/* ── Nombres como están en producción, bien y mal escritos ───────────── */
const SEMILLA = [
  { name: "HELADERA WHIRPOOL NO FROST 375L", brand: "" },
  { name: "TURBINA WHIRPOOL 220V", brand: "" },
  { name: "PLACA WHIRLPOOL 6 SENTIDO", brand: "" },      // ya está bien
  { name: "Motor whirpool chico", brand: "" },            // minúsculas
  { name: "LAVARROPAS 8KG CARGA SUPERIOR", brand: "WHIRPOOL" },
  { name: "VALVULA DANFOS 3/8", brand: "" },
  { name: "FILTRO DANFOSS 1/4 SOLDAR", brand: "" },       // DANFOSS no se toca
  { name: "ESLABON de lujo 10 MM", brand: "" },           // nada que ver
];

await productModel.insertMany(
  SEMILLA.map((p, i) => ({
    name: p.name,
    brand: p.brand,
    productCode: String(30000000 + i),
    description: p.name,
    priceARS: 1000,
    active: true,
  }))
);

/** Corre el script como proceso aparte y devuelve su salida. */
function correr(...extra) {
  const r = spawnSync(process.execPath, [SCRIPT, ...extra], {
    cwd: trabajo,
    env: { ...process.env, MONGO_URI: process.env.MONGO_URI },
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(`el script salió con código ${r.status}\n${r.stderr || r.stdout}`);
  }
  // Los avisos salen por stderr: se juntan, porque lo que se prueba es lo que
  // ve quien corre el script en la terminal.
  return r.stdout + r.stderr;
}

const nombreDe = async (codigo) =>
  (await productModel.findOne({ productCode: codigo }).select("name brand").lean());

const archivos = (ext) => fs.readdirSync(trabajo).filter((f) => f.endsWith(ext));

console.log("\nSimulación");
console.log("─".repeat(50));

await check("Simula, cuenta los cambios y no escribe nada", async () => {
  const salida = correr();
  if (!/SIMULACIÓN/.test(salida)) throw new Error("no avisó que era una simulación");
  if (!/Whirlpool/.test(salida)) throw new Error("no mencionó Whirlpool");
  const p = await nombreDe("30000000");
  esperar(p.name, "HELADERA WHIRPOOL NO FROST 375L", "el nombre sigue igual");
  esperar(archivos(".json").length, 0, "registros de corrida escritos");
  return `${archivos(".csv").length} CSV para revisar, 0 escrituras`;
});

await check("El CSV trae el antes y el después", () => {
  const csv = fs.readFileSync(path.join(trabajo, archivos(".csv")[0]), "utf8");
  if (!csv.includes("HELADERA WHIRPOOL NO FROST 375L")) throw new Error("falta el antes");
  if (!csv.includes("HELADERA WHIRLPOOL NO FROST 375L")) throw new Error("falta el después");
  return csv.trim().split(/\r?\n/).length - 1 + " filas";
});

await check("Con --marca trabaja una sola", async () => {
  const salida = correr("--marca", "Danfoss");
  if (/Whirlpool/.test(salida)) throw new Error("tocó Whirlpool igual");
  if (!/Danfoss/.test(salida)) throw new Error("no mencionó Danfoss");
});

await check("Una marca que no está en las reglas avisa y no hace nada", () => {
  const salida = correr("--marca", "Samsung");
  if (!/No tengo reglas/.test(salida)) throw new Error("no avisó");
});

console.log("\nCorrección");
console.log("─".repeat(50));

await check("Corrige las mal escritas al confirmar", async () => {
  const salida = correr("--confirmar");
  if (!/campos corregidos/.test(salida)) throw new Error(`salida inesperada:\n${salida}`);
  esperar((await nombreDe("30000000")).name, "HELADERA WHIRLPOOL NO FROST 375L", "heladera");
  esperar((await nombreDe("30000001")).name, "TURBINA WHIRLPOOL 220V", "turbina");
  esperar((await nombreDe("30000005")).name, "VALVULA DANFOSS 3/8", "valvula");
  return "el resto del nombre queda carácter por carácter igual";
});

await check("Respeta las mayúsculas del original", async () => {
  esperar((await nombreDe("30000003")).name, "Motor whirpool chico".replace("whirpool", "whirlpool"), "minúsculas");
});

await check("Corrige también el campo marca", async () => {
  const p = await nombreDe("30000004");
  esperar(p.brand, "WHIRLPOOL", "marca");
  esperar(p.name, "LAVARROPAS 8KG CARGA SUPERIOR", "el nombre no se toca");
});

await check("No toca lo que ya estaba bien escrito", async () => {
  esperar((await nombreDe("30000002")).name, "PLACA WHIRLPOOL 6 SENTIDO", "whirlpool correcto");
  esperar((await nombreDe("30000006")).name, "FILTRO DANFOSS 1/4 SOLDAR", "DANFOSS no es DANFOS");
  esperar((await nombreDe("30000007")).name, "ESLABON de lujo 10 MM", "producto ajeno");
});

await check("Correrlo de nuevo no encuentra nada que corregir", () => {
  const salida = correr("--confirmar");
  if (!/No hay nada que corregir/.test(salida)) throw new Error(`salida inesperada:\n${salida}`);
  return "es idempotente";
});

console.log("\nDeshacer");
console.log("─".repeat(50));

const registro = path.join(trabajo, archivos(".json")[0]);

await check("Deshacer también simula primero", async () => {
  const salida = correr("--deshacer", registro);
  if (!/SIMULACIÓN/.test(salida)) throw new Error("no avisó que era una simulación");
  esperar((await nombreDe("30000000")).name, "HELADERA WHIRLPOOL NO FROST 375L", "sigue corregido");
});

await check("No revierte lo que se editó después de la corrida", async () => {
  await productModel.updateOne(
    { productCode: "30000001" },
    { $set: { name: "TURBINA WHIRLPOOL 220V REFORZADA" } }
  );
  const salida = correr("--deshacer", registro);
  if (!/se revertirían 4 de 5/.test(salida)) {
    throw new Error(`esperaba 4 de 5 reversibles:\n${salida}`);
  }
  return "el que cambió a mano queda afuera";
});

await check("Deshacer devuelve los nombres a como estaban", async () => {
  correr("--deshacer", registro, "--confirmar");
  esperar((await nombreDe("30000000")).name, "HELADERA WHIRPOOL NO FROST 375L", "heladera");
  esperar((await nombreDe("30000005")).name, "VALVULA DANFOS 3/8", "valvula");
  esperar((await nombreDe("30000004")).brand, "WHIRPOOL", "marca");
  esperar(
    (await nombreDe("30000001")).name,
    "TURBINA WHIRLPOOL 220V REFORZADA",
    "el editado a mano no se toca"
  );
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
fs.rmSync(trabajo, { recursive: true, force: true });
process.exitCode = fallos.length ? 1 : 0;
