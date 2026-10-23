/**
 * Prueba los parámetros del endpoint público del catálogo (/api/products)
 * contra una base en memoria descartable.
 *
 * Los casos salen de una auditoría contra producción: `limit=abc` devolvía los
 * 3665 productos de una (842 KB), `page=0` daba un error 500, y se podía
 * ordenar por cualquier campo, incluido el costo en dólares.
 *
 * No forma parte del build (ver la nota en __test-recuperacion.mjs):
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-catalogo.mjs
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
const { getProductsByCategory } = await import("../controllers/productsController.js");

// 150 productos: más que el tope de 100 por página, para que se note si se lo saltea.
await productModel.insertMany(
  Array.from({ length: 150 }, (_, i) => ({
    name: `PRODUCTO ${String(i).padStart(3, "0")}`,
    description: "x",
    productCode: String(40000000 + i),
    priceARS: 1000 + i,
    // El costo va al revés que el precio de venta: si se pudiera ordenar por él,
    // el orden revelaría cuál es más barato de comprar.
    priceUSD: 500 - i,
    active: true,
  }))
);

function fakeRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  r.set = () => r;
  return r;
}
async function catalogo(query) {
  const res = fakeRes();
  await getProductsByCategory({ query, params: {} }, res);
  return res;
}

console.log("\nPaginado");
console.log("─".repeat(50));

await check("limit=abc no devuelve el catálogo entero", async () => {
  const r = await catalogo({ limit: "abc", page: "1" });
  esperar(r.statusCode, 200, "status");
  if (r.body.products.length > 100) {
    throw new Error(`devolvió ${r.body.products.length}: se salteó el tope`);
  }
  return `${r.body.products.length} productos (antes: todos)`;
});

await check("limit=5000 se recorta a 100", async () => {
  const r = await catalogo({ limit: "5000", page: "1" });
  esperar(r.body.products.length, 100, "productos");
});

await check("limit negativo no rompe", async () => {
  const r = await catalogo({ limit: "-5", page: "1" });
  esperar(r.statusCode, 200, "status");
  esperar(r.body.products.length, 1, "productos");
});

await check("page=0 no es un error 500", async () => {
  const r = await catalogo({ limit: "24", page: "0" });
  esperar(r.statusCode, 200, "status");
  esperar(r.body.page, 1, "página");
  return "antes: 500";
});

await check("page negativa no es un error 500", async () => {
  const r = await catalogo({ limit: "24", page: "-3" });
  esperar(r.statusCode, 200, "status");
  esperar(r.body.page, 1, "página");
});

await check("page=abc va a la primera página", async () => {
  const r = await catalogo({ limit: "24", page: "abc" });
  esperar(r.statusCode, 200, "status");
  esperar(r.body.page, 1, "página");
  esperar(r.body.hasMore, true, "hasMore");
});

await check("El paginado normal sigue igual", async () => {
  const r = await catalogo({ limit: "24", page: "7" });
  esperar(r.body.products.length, 6, "productos en la última página");
  esperar(r.body.hasMore, false, "hasMore");
  esperar(r.body.pages, 7, "páginas");
});

console.log("\nOrden");
console.log("─".repeat(50));

await check("Se ordena por los campos del selector", async () => {
  const r = await catalogo({ limit: "3", page: "1", sort: "priceARS:desc" });
  esperar(r.body.products[0].priceARS, 1149, "el más caro primero");
});

await check("No se puede ordenar por el costo en dólares", async () => {
  const porCosto = await catalogo({ limit: "3", page: "1", sort: "priceUSD:asc" });
  // Si el orden se aplicara, el primero sería el de menor costo: el último
  // cargado, que es el de mayor precio de venta (1149).
  if (porCosto.body.products[0].priceARS === 1149) {
    throw new Error("el orden por costo se aplicó");
  }
  return "el campo se ignora";
});

console.log("\nPrecios");
console.log("─".repeat(50));

await check("minPrice=abc no vacía el catálogo", async () => {
  const r = await catalogo({ limit: "24", page: "1", minPrice: "abc" });
  esperar(r.body.total, 150, "total");
  return "antes: 0 resultados";
});

await check("minPrice y maxPrice válidos siguen filtrando", async () => {
  const r = await catalogo({ limit: "100", page: "1", minPrice: "1100", maxPrice: "1109" });
  esperar(r.body.total, 10, "total");
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
