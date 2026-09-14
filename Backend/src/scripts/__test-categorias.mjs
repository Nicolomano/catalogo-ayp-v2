/**
 * Prueba que el menú de categorías del catálogo muestre SOLO lo creado en el
 * panel, ignorando los Rubro/SubRubro que el Excel del contable escribe en cada
 * producto.
 *
 * No forma parte del build (ver la nota en __test-recuperacion.mjs):
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-categorias.mjs
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

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
process.env.JWT_SECRET ||= "secreto-solo-para-esta-prueba-descartable";
await mongoose.connect(process.env.MONGO_URI);
console.log("\nBase de prueba levantada\n");

const productModel = (await import("../services/models/productModel.js")).default;
const Category = (await import("../services/models/category.js")).default;
const { getCategoriesMeta } = await import("../controllers/productsController.js");

/** res falso: guarda lo que devuelve el controller. */
function fakeRes() {
  const r = { statusCode: 200, body: null, set: () => r };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
}
const pedirMeta = async () => {
  const res = fakeRes();
  await getCategoriesMeta({ query: {} }, res);
  esperar(res.statusCode, 200, "status");
  return res.body;
};

console.log("Menú de categorías del catálogo");
console.log("─".repeat(40));

// Panel: dos categorías, una con subcategoría y otra sin ninguna.
const bronce = await new Category({ name: "Accesorios de bronce" }).save();
await new Category({ name: "Tuercas", parent: bronce._id }).save();
const aceites = await new Category({ name: "Aceites y lubricantes" }).save();

// Productos como los deja la importación del Excel (Rubro/SubRubro del contable).
await productModel.insertMany([
  { name: "Tuerca 1/4", productCode: "A1", description: "x", priceARS: 100, active: true,
    categories: ["Accesorios de bronce"], subcategories: ["Tuercas"] },
  { name: "Aceite 1L", productCode: "A2", description: "x", priceARS: 100, active: true,
    categories: ["Aceites y lubricantes"], subcategories: ["Rulemanes"] },
  { name: "Tornillo", productCode: "A3", description: "x", priceARS: 100, active: true,
    categories: ["Aceites y lubricantes"], subcategories: ["Tuercas/tornillos"] },
  { name: "Sin rubro", productCode: "A4", description: "x", priceARS: 100, active: true,
    categories: [], subcategories: ["-"] },
  { name: "Rubro inventado", productCode: "A5", description: "x", priceARS: 100, active: true,
    categories: ["Rubro que nadie creó"], subcategories: ["Algo"] },
]);

await check("Solo aparecen las categorías creadas en el panel", async () => {
  const meta = await pedirMeta();
  const nombres = meta.map((m) => m.category).sort();
  esperar(nombres.join(" | "), "Accesorios de bronce | Aceites y lubricantes", "categorías");
  return nombres.join(", ");
});

await check("Las subcategorías del Excel no se ofrecen como filtro", async () => {
  const meta = await pedirMeta();
  const ace = meta.find((m) => m.category === "Aceites y lubricantes");
  esperar(ace.subcategories.length, 0, "subcategorías de Aceites");
  return 'se descartan "Rulemanes" y "Tuercas/tornillos"';
});

await check("Las subcategorías creadas en el panel sí se muestran", async () => {
  const meta = await pedirMeta();
  const br = meta.find((m) => m.category === "Accesorios de bronce");
  esperar(br.subcategories.join(","), "Tuercas", "subcategorías de bronce");
});

await check("Una subcategoría vale solo dentro de SU categoría", async () => {
  // "Tuercas" existe en el panel, pero colgando de "Accesorios de bronce".
  await new productModel({ name: "Intruso", productCode: "A6", description: "x", priceARS: 100,
    active: true, categories: ["Aceites y lubricantes"], subcategories: ["Tuercas"] }).save();
  const meta = await pedirMeta();
  const ace = meta.find((m) => m.category === "Aceites y lubricantes");
  esperar(ace.subcategories.length, 0, "Tuercas se coló en Aceites");
  return "no se filtra por nombre suelto";
});

await check("El producto conserva su dato aunque no se muestre", async () => {
  const p = await productModel.findOne({ productCode: "A2" }).lean();
  esperar(p.subcategories.join(","), "Rulemanes", "subcategoría guardada");
  return "solo se oculta del menú, no se borra nada";
});

await check("Sin categorías en el panel, no se rompe el menú", async () => {
  await Category.deleteMany({});
  const meta = await pedirMeta();
  if (!meta.length) throw new Error("el menú quedó vacío");
  const ace = meta.find((m) => m.category === "Aceites y lubricantes");
  if (!ace.subcategories.length) throw new Error("tampoco devolvió las subcategorías del Excel");
  // Se restaura para no dejar la base a medias por si se agregan más pruebas.
  const b = await new Category({ name: "Accesorios de bronce" }).save();
  await new Category({ name: "Tuercas", parent: b._id }).save();
  await new Category({ name: "Aceites y lubricantes" }).save();
  return `red de seguridad: vuelve al modo anterior (${meta.length} categorías)`;
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
