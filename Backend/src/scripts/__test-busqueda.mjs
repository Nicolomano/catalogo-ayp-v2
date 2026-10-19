/**
 * Prueba el buscador del catálogo contra una base real (en memoria,
 * descartable), sembrada con NOMBRES REALES del catálogo de producción.
 *
 * Los casos salen de las búsquedas que de verdad fallaron, tomadas del panel de
 * métricas: "rulemanes" devolvía 0 teniendo 54 rulemanes, y "tubo de nitrógeno"
 * devolvía 0 teniendo 5 tubos cargados como "TUBO DE NITRO".
 *
 * No forma parte del build (ver la nota en __test-recuperacion.mjs):
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-busqueda.mjs
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

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

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
await mongoose.connect(process.env.MONGO_URI);

const productModel = (await import("../services/models/productModel.js")).default;
const { filtroBusqueda, filtroReintento, palabrasDe } = await import(
  "../utils/busqueda.js"
);

/* ── Nombres tal cual están en producción ────────────────────────────── */
const NOMBRES = [
  // Los 5 tubos de nitrógeno: el catálogo dice NITRO, no nitrógeno
  "TUBO DE NITRO 1/4 MT HIERRO",
  "TUBO DE NITRO 1/2 MT HIERRO",
  "TUBO DE NITRO 1 MT HIERRO",
  "TUBO DE NITRO 1/2 MT ALUMINIO",
  "TUBO DE NITRO DE 1 MT ALUMINIO",
  // Otros "nitro" que NO son tubos
  "MANOMETRO BAJA NITRO (C)",
  "MANOMETRO NITRO ALTA ROSCA FINA",
  "VALVULA DE NITRO ROSCA DE 1/2 (MP)",
  "REGULADOR DE NITROGENO 5/8 COOLTECH",
  // Rulemanes
  "RULEMAN 608 ZZ FMB (INDIO)",
  "RULEMAN 6202 2RC/C3 KZ",
  "RULEMAN 6203 2RS FAG",
  // Tubos que no son de nitrógeno
  "Tubo 1.8m WINCELL 1/4 9mm",
  "Tubo 1.8m WINCELL 3/8 9mm",
  // Bomba de vacío, con y sin "de"
  "BOMBA DE VACIO EVERTECH EVP70 70LT",
  "FIN-BOMBA DE VACIO 70 l/m-1 ETAPA",
  "BOMBA VACIO EVERTECH 113LT A BATERIA",
  // Plaqueta + inverter separados por otras palabras
  "PLAQUETA UNIVERSAL NO FROST BASIC",
  "PLACA POTENCIA WHIRPOOL 6° SENTIDO INVERTER",
  "Presostato Samsung Inverter",
  // Abreviaturas del contable
  "FILCAP U/C 1 1/2 HP R22/R134/R404",
  "FILCAP U/C 1/2 HP R22/R134/R404",
  "MOTOC.TECUMSEH 1/8+AZ1340--90fr/h",
  // El condensador que NO debe confundirse con un capacitor
  "CONDENSADOR FAMILIAR 1/3 1360X590",
  "CAPACITOR 1,2MF MICROONDAS",
  "Capacitor para microondas 0.85 uf 2100v",
  // Con tilde en el nombre, para probar el cruce de acentos
  "PINZA DE PUNTA METZ 6¨ (ALICATE 1/2 CAÑA)",
  "PERILLA HORNO ELECTRICO 1/2 CAÑA BLANCA",
];

await productModel.insertMany(
  NOMBRES.map((n, i) => ({
    name: n,
    productCode: String(20000000 + i),
    description: n,
    priceARS: 1000,
    active: true,
  }))
);

/** Cuántos productos devuelve el filtro normal. */
const contar = async (termino) => {
  const f = filtroBusqueda(termino);
  return f ? productModel.countDocuments(f) : productModel.countDocuments({});
};

/** Lo que devuelve el endpoint: primero el filtro normal; si da 0, el reintento. */
async function buscar(termino) {
  const total = await contar(termino);
  if (total > 0) return { total, sugerido: false };
  const alt = filtroReintento(termino);
  if (!alt) return { total: 0, sugerido: false };
  const cuenta = await productModel.countDocuments(alt);
  return { total: cuenta, sugerido: cuenta > 0 };
}

const nombres = async (termino) => {
  const f = filtroBusqueda(termino);
  return (await productModel.find(f || {}).select("name").lean()).map((p) => p.name);
};

console.log("\nLo que antes no encontraba nada");
console.log("─".repeat(50));

await check("«rulemanes» encuentra los rulemanes (plural)", async () => {
  esperar(await contar("rulemanes"), 3, "resultados");
  return "antes: 0";
});

await check("«tubo nitro» encuentra los 5 tubos (palabras sueltas)", async () => {
  const r = await nombres("tubo nitro");
  esperar(r.length, 5, "resultados");
  if (r.some((n) => !/TUBO/i.test(n))) throw new Error("se coló algo que no es un tubo");
  return "antes: 0 — le faltaba el «de»";
});

await check("«tubo de nitrógeno» encuentra los 5 tubos", async () => {
  const r = await nombres("tubo de nitrógeno");
  esperar(r.length, 5, "resultados");
  if (r.some((n) => !/TUBO/i.test(n))) throw new Error("se coló algo que no es un tubo");
  return "nitrógeno → nitro, sin necesidad de reintentar";
});

await check("Una abreviatura sin sinónimo la salva el reintento", async () => {
  // "manometro" está completo en el catálogo, pero se prueba el mecanismo de
  // acortado con una palabra más larga que la cargada.
  esperar(await contar("manometros"), 2, "plural, directo");
  const r = await buscar("reguladores");
  if (r.total < 1) throw new Error("no encontró el regulador");
  return `${r.total} resultado(s)`;
});

await check("«bomba vacio» encuentra también los que dicen «de»", async () => {
  esperar(await contar("bomba vacio"), 3, "resultados");
  return "antes encontraba solo el que no decía «de»";
});

await check("«plaqueta inverter» cruza palabras separadas", async () => {
  // "PLACA POTENCIA ... INVERTER": plaqueta no está, pero sí por sinónimo placa.
  const r = await buscar("placa inverter");
  if (r.total < 1) throw new Error("no encontró la placa inverter");
  return `${r.total} resultado(s)`;
});

await check("«filtro capilar» encuentra los FILCAP (sinónimo)", async () => {
  esperar(await contar("filtro capilar"), 2, "resultados");
  return "filcap no es prefijo de filtro: lo resuelve el diccionario";
});

await check("«tuvo» sugiere tubo (error de tipeo)", async () => {
  esperar(await contar("tuvo"), 0, "no debería encontrarlo directo");
  const r = await buscar("tuvo");
  if (r.total < 5) throw new Error(`esperaba varios tubos, encontró ${r.total}`);
  esperar(r.sugerido, true, "debería avisar que reintentó");
  return `${r.total} resultados con la corrección`;
});

console.log("\nLo que no se tiene que romper");
console.log("─".repeat(50));

await check("«ruleman» sigue encontrando lo mismo", async () => {
  esperar(await contar("ruleman"), 3, "resultados");
});

await check("«1/2 hp» no rompe el regex", async () => {
  const n = await contar("1/2 hp");
  if (n < 2) throw new Error(`esperaba varios, encontró ${n}`);
  return `${n} resultados`;
});

await check("Un término con paréntesis y comillas no rompe", async () => {
  await contar('pinza (alicate) "6¨"');
  await contar("....***");
  return "no lanza";
});

await check("Las tildes siguen cruzando en los dos sentidos", async () => {
  esperar(await contar("caña"), 2, "con tilde");
  esperar(await contar("cana"), 2, "sin tilde");
});

await check("«condensador» NO devuelve capacitores", async () => {
  const r = await nombres("condensador");
  esperar(r.length, 1, "resultados");
  if (r.some((n) => /CAPACITOR/i.test(n))) {
    throw new Error("¡se coló un capacitor! El sinónimo prohibido está activo");
  }
  return r[0];
});

await check("«capacitor» NO devuelve el condensador", async () => {
  const r = await nombres("capacitor");
  esperar(r.length, 2, "resultados");
  if (r.some((n) => /CONDENSADOR/i.test(n))) throw new Error("se coló el condensador");
});

console.log("\nLos límites");
console.log("─".repeat(50));

await check("Término vacío o solo palabras vacías no filtra nada", () => {
  esperar(filtroBusqueda(""), null, "vacío");
  esperar(filtroBusqueda("   "), null, "espacios");
  esperar(filtroBusqueda("de la el"), null, "solo palabras vacías");
});

await check("Las palabras vacías se descartan", () => {
  esperar(palabrasDe("tubo de nitrogeno").join(","), "tubo,nitrogeno", "palabras");
  esperar(palabrasDe("bomba para vacio").join(","), "bomba,vacio", "palabras");
});

await check("Corta en 6 palabras", () => {
  const p = palabrasDe("uno dos tres cuatro cinco seis siete ocho nueve");
  esperar(p.length, 6, "cantidad");
});

await check("Corta en 64 caracteres", () => {
  const largo = "a".repeat(200) + " zzz";
  const p = palabrasDe(largo);
  if (p.join(" ").length > 64) throw new Error("no respetó el tope");
  return `${p[0].length} caracteres`;
});

await check("El plural no se come palabras cortas", () => {
  esperar(palabrasDe("gas").join(""), "gas", "gas no pierde la s");
  esperar(palabrasDe("mes").join(""), "mes", "mes no pierde la s");
  esperar(palabrasDe("tubos").join(""), "tubo", "tubos sí");
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
