/**
 * Prueba que la importación de Excel escriba SOLO lo que cambió.
 *
 * Antes escribía el precio y el stock de todos los productos en cada
 * importación, aunque no hubieran cambiado, y Mongoose renueva `updatedAt` en
 * cada escritura: el sitemap le decía a Google que los 3666 productos se habían
 * modificado ese día. Google aprende que esa fecha no significa nada y la
 * ignora. La vista previa, además, decía "3664 a actualizar".
 *
 * No forma parte del build (ver la nota en __test-recuperacion.mjs):
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-importacion.mjs
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
  const a = JSON.stringify(real);
  const b = JSON.stringify(esp);
  if (a !== b) throw new Error(`${que}: ${a}, se esperaba ${b}`);
};

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
await mongoose.connect(process.env.MONGO_URI);

const productModel = (await import("../services/models/productModel.js")).default;
const { buildUpdate } = await import("../controllers/productsController.js");

/** Un producto como está en la base, con los campos que trae CAMPOS_PARA_COMPARAR. */
const enLaBase = {
  productCode: "20345",
  priceARS: 12500,
  priceUSD: undefined,
  fixedInARS: true,
  inStock: true,
  brand: "DREAN",
  categories: ["Lavarropas"],
  subcategories: ["Bombas"],
};

/** Una fila del Excel del sistema contable (formato "new"). */
const fila = (cambios = {}) => ({
  priceARS: 12500,
  inStock: true,
  parsedCats: [],
  parsedSubs: [],
  ...cambios,
});

console.log("\nFormato del sistema contable");
console.log("─".repeat(50));

await check("Una fila sin cambios no escribe nada", () => {
  esperar(buildUpdate(fila(), enLaBase, "new", null), {}, "update");
  return "antes: { priceARS, fixedInARS, inStock } siempre";
});

await check("Si cambia solo el precio, escribe solo el precio", () => {
  esperar(buildUpdate(fila({ priceARS: 13000 }), enLaBase, "new", null), { priceARS: 13000 }, "update");
});

await check("El precio se compara ya redondeado", () => {
  // El Excel trae decimales (12500,40) y en la base está redondeado: es el
  // mismo precio, no un cambio.
  esperar(buildUpdate(fila({ priceARS: 12500.4 }), enLaBase, "new", null), {}, "update");
});

await check("Si se queda sin stock, escribe el stock", () => {
  esperar(buildUpdate(fila({ inStock: false }), enLaBase, "new", null), { inStock: false }, "update");
});

await check("Las categorías puestas a mano no se pisan", () => {
  const u = buildUpdate(fila({ parsedCats: ["Otra"] }), enLaBase, "new", null);
  esperar(u, {}, "update");
});

await check("Un producto sin categoría toma la del Excel", () => {
  const u = buildUpdate(fila({ parsedCats: ["Lavarropas"] }), { ...enLaBase, categories: [] }, "new", null);
  esperar(u, { categories: ["Lavarropas"] }, "update");
});

console.log("\nFormato clásico");
console.log("─".repeat(50));

const clasica = (cambios = {}) => ({
  priceARS: 12500,
  priceUSD: null,
  inStock: true,
  brandVal: "DREAN",
  parsedCats: ["Lavarropas"],
  parsedSubs: ["Bombas"],
  ...cambios,
});

await check("Una fila sin cambios no escribe nada", () => {
  esperar(buildUpdate(clasica(), enLaBase, "classic", null), {}, "update");
});

await check("Si cambia la marca, escribe solo la marca", () => {
  esperar(buildUpdate(clasica({ brandVal: "WHIRLPOOL" }), enLaBase, "classic", null), { brand: "WHIRLPOOL" }, "update");
});

await check("Si cambian las categorías, las escribe", () => {
  const u = buildUpdate(clasica({ parsedSubs: ["Plaquetas"] }), enLaBase, "classic", null);
  esperar(u, { subcategories: ["Plaquetas"] }, "update");
});

console.log("\nLa fecha que ve Google");
console.log("─".repeat(50));

await check("Escribir el mismo valor SÍ renueva la fecha (por eso hay que no escribirlo)", async () => {
  const p = await productModel.create({
    name: "BOMBA", description: "x", productCode: "1", priceARS: 100, inStock: true,
  });
  const antes = p.updatedAt.getTime();
  await new Promise((r) => setTimeout(r, 20));
  await productModel.updateOne({ _id: p._id }, { $set: { priceARS: 100, inStock: true } });
  const despues = (await productModel.findById(p._id).lean()).updatedAt.getTime();
  if (despues === antes) throw new Error("Mongoose no renovó la fecha: el arreglo no haría falta");
  return "Mongoose agrega updatedAt a cualquier $set, aunque no cambie nada";
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
