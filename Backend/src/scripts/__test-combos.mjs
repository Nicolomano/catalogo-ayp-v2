/**
 * Prueba los combos de punta a punta contra una base real (en memoria,
 * descartable): el precio que sale de las piezas, el stock, el pedido y el
 * texto que llega por WhatsApp.
 *
 * Lo que más importa verificar, porque es un requisito del negocio y no se ve
 * mirando el código: **en el sistema de A&P los combos no existen**. El
 * presupuesto se carga pieza por pieza, así que el pedido tiene que llegar con
 * el combo en una línea Y con el código de cada pieza, con las cantidades
 * totales a facturar.
 *
 * No forma parte del build (ver la nota en __test-recuperacion.mjs):
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-combos.mjs
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

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
const orderModel = (await import("../services/models/orderModel.js")).default;
const serviceUserModel = (await import("../services/models/serviceUserModel.js")).default;
const SiteConfig = (await import("../services/models/siteConfigModel.js")).default;
const { resolverCombos, recalcularCombosGuardados, SOLO_PRODUCTOS, esCombo } =
  await import("../utils/combos.js");
const { createOrder } = await import("../controllers/orderController.js");
const { toggleStock } = await import("../controllers/productsController.js");
const { crearCombo, actualizarCombo, cotizarCombo, listarCombos } = await import(
  "../controllers/comboController.js"
);

/* ── Las piezas, con nombres reales del catálogo ─────────────────────── */
const PIEZAS = [
  { productCode: "10234", name: "CAÑO 1/4 X 1MT", priceARS: 8000 },
  { productCode: "10567", name: "AISLANTE 1/4 X 2MT", priceARS: 3500 },
  { productCode: "10890", name: "KIT TORNILLOS SOPORTE SPLIT", priceARS: 2500 },
  { productCode: "10999", name: "CINTA AISLANTE BLANCA", priceARS: 1200 },
];

await productModel.insertMany(
  PIEZAS.map((p) => ({ ...p, description: p.name, active: true, inStock: true, fixedInARS: true }))
);

// El local tiene que tener WhatsApp cargado: el texto del pedido viaja dentro
// del link, y sin número no se arma el link.
await SiteConfig.create({ whatsapp: "5491122334455" });

function fakeRes() {
  const r = { statusCode: 200, body: null, headers: {} };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  r.set = (k, v) => ((r.headers[k] = v), r);
  return r;
}

/** Llama a un controller con este body y devuelve lo que respondió. */
async function llamar(controller, { body = {}, params = {}, headers = {} } = {}) {
  const res = fakeRes();
  await controller({ body, params, headers, query: {} }, res);
  return res;
}

/** El texto que de verdad va a leer el que atiende el WhatsApp. */
const textoDelPedido = (waLink) =>
  decodeURIComponent(new URL(waLink).searchParams.get("text"));

const COMPONENTES = [
  { productCode: "10234", quantity: 2 },
  { productCode: "10567", quantity: 1 },
  { productCode: "10890", quantity: 1 },
];
// 2×8000 + 3500 + 2500
const PRECIO_ESPERADO = 22000;

console.log("\nEl precio sale de las piezas");
console.log("─".repeat(50));

let combo;

await check("Crear un combo calcula el precio como la suma de sus piezas", async () => {
  const res = await llamar(crearCombo, {
    body: {
      name: "Combo instalación split 3500W",
      productCode: "COMBO-001",
      componentes: COMPONENTES,
      categories: ["Aire acondicionado"],
    },
  });
  esperar(res.statusCode, 201, "status");
  combo = res.body.combo;
  esperar(combo.priceARS, PRECIO_ESPERADO, "precio");
  esperar(combo.inStock, true, "stock");
  return `$${combo.priceARS}`;
});

await check("El precio también queda GUARDADO, para poder ordenar por precio", async () => {
  // Ordenar y filtrar por precio los hace Mongo, antes de que el código vea los
  // documentos: si el guardado quedara en 0, el combo se ordenaría como el más
  // barato del catálogo.
  const enLaBase = await productModel.findOne({ productCode: "COMBO-001" }).lean();
  esperar(enLaBase.priceARS, PRECIO_ESPERADO, "precio guardado");
});

await check("Si cambia el precio de una pieza, cambia el del combo solo", async () => {
  await productModel.updateOne({ productCode: "10234" }, { $set: { priceARS: 9000 } });
  const docs = await productModel.find({ productCode: "COMBO-001" }).lean();
  await resolverCombos(docs);
  esperar(docs[0].priceARS, 24000, "precio recalculado");
  await productModel.updateOne({ productCode: "10234" }, { $set: { priceARS: 8000 } });
  return "no hay que volver a tocar el combo";
});

await check("El detalle trae cada pieza con su código y su cantidad", async () => {
  const docs = await productModel.find({ productCode: "COMBO-001" }).lean();
  await resolverCombos(docs);
  const d = docs[0].componentesDetalle;
  esperar(d.length, 3, "piezas");
  esperar(d[0].productCode, "10234", "código de la primera");
  esperar(d[0].quantity, 2, "cantidad de la primera");
  esperar(d[0].name, "CAÑO 1/4 X 1MT", "nombre de la primera");
});

/** Cuántas consultas hace `fn`, contando las find() al modelo de productos. */
async function contandoConsultas(fn) {
  const original = productModel.find;
  let consultas = 0;
  productModel.find = function (...args) {
    consultas++;
    return original.apply(this, args);
  };
  try {
    await fn();
  } finally {
    productModel.find = original;
  }
  return consultas;
}

await check("Una página sin combos no hace NINGUNA consulta extra", async () => {
  // El catálogo entero pasa por resolverCombos: si cobrara una consulta por
  // página, se pagaría en cada búsqueda y en cada scroll.
  const sueltos = await productModel.find(SOLO_PRODUCTOS).select("name componentes").lean();
  const consultas = await contandoConsultas(() => resolverCombos(sueltos));
  esperar(consultas, 0, "consultas");
  if (sueltos.some((p) => p.componentesDetalle)) throw new Error("tocó productos normales");
  return "sale en la primera línea si no hay combos";
});

await check("Una página CON combos hace una sola consulta, no una por combo", async () => {
  const pagina = await productModel
    .find({ active: true })
    .select("name priceARS inStock componentes")
    .lean();
  const consultas = await contandoConsultas(() => resolverCombos(pagina));
  esperar(consultas, 1, "consultas");
  return "todas las piezas de todos los combos en una sola";
});

console.log("\nStock: el combo vale lo que su pieza más escasa");
console.log("─".repeat(50));

await check("Una pieza sin stock deja el combo sin stock, y dice cuál", async () => {
  await productModel.updateOne({ productCode: "10567" }, { $set: { inStock: false } });
  const docs = await productModel.find({ productCode: "COMBO-001" }).lean();
  await resolverCombos(docs);
  esperar(docs[0].inStock, false, "stock");
  esperar(docs[0].faltan.join(""), "AISLANTE 1/4 X 2MT", "qué falta");
  // El precio sigue siendo el real: no tener stock no lo abarata.
  esperar(docs[0].priceARS, PRECIO_ESPERADO, "precio");
  return `"falta ${docs[0].faltan[0]}"`;
});

await check("Vuelve a tener stock cuando se repone la pieza", async () => {
  await productModel.updateOne({ productCode: "10567" }, { $set: { inStock: true } });
  const docs = await productModel.find({ productCode: "COMBO-001" }).lean();
  await resolverCombos(docs);
  esperar(docs[0].inStock, true, "stock");
});

await check("Una pieza dada de baja lo deja sin stock e incompleto", async () => {
  await productModel.updateOne({ productCode: "10890" }, { $set: { active: false } });
  const docs = await productModel.find({ productCode: "COMBO-001" }).lean();
  await resolverCombos(docs);
  esperar(docs[0].inStock, false, "stock");
  esperar(docs[0].incompleto, true, "incompleto");
  // Sin la pieza, la suma da de menos. Por eso queda sin stock: cotizar de menos
  // en silencio es el error que ya se arregló una vez en la calculadora del kit.
  esperar(docs[0].priceARS, PRECIO_ESPERADO - 2500, "precio sin la pieza");
  await productModel.updateOne({ productCode: "10890" }, { $set: { active: true } });
  return "no se puede pedir, y el panel lo muestra en rojo";
});

await check("Una pieza borrada tampoco se cotiza en silencio", async () => {
  const copia = await productModel.findOne({ productCode: "10890" }).lean();
  await productModel.deleteOne({ productCode: "10890" });
  const docs = await productModel.find({ productCode: "COMBO-001" }).lean();
  await resolverCombos(docs);
  esperar(docs[0].incompleto, true, "incompleto");
  esperar(docs[0].inStock, false, "stock");
  if (!/10890/.test(docs[0].componentesDetalle[2].name)) {
    throw new Error("no dice de qué pieza se trata");
  }
  delete copia._id;
  await productModel.create(copia);
});

console.log("\nLa importación de Excel no los puede tocar");
console.log("─".repeat(50));

await check("Un combo NO figura entre los faltantes de un Excel", async () => {
  // Es la consulta exacta que usan previewImportExcel y commitImportExcel para
  // armar la lista de "productos que no vinieron en el archivo", que es la
  // pantalla donde un tilde los borra para siempre.
  const activos = await productModel.find({ active: true, ...SOLO_PRODUCTOS }).lean();
  if (activos.some((p) => p.productCode === "COMBO-001")) {
    throw new Error("el combo entró en la lista de borrar del import");
  }
  esperar(activos.length, PIEZAS.length, "productos normales activos");
  return "no hay soft-delete: un clic y se perdía";
});

await check("Tocar el stock de una pieza actualiza el stock guardado del combo", async () => {
  // Lo que se muestra se calcula al vuelo, pero el valor guardado es el que usa
  // Mongo para elegir qué mostrar cuando una búsqueda no encuentra nada: un
  // combo sin stock no puede aparecer entre "lo más vendido".
  const pieza = await productModel.findOne({ productCode: "10567" }).lean();
  await llamar(toggleStock, { params: { id: String(pieza._id) } });
  let enLaBase = await productModel.findOne({ productCode: "COMBO-001" }).lean();
  esperar(enLaBase.inStock, false, "stock guardado del combo");

  await llamar(toggleStock, { params: { id: String(pieza._id) } });
  enLaBase = await productModel.findOne({ productCode: "COMBO-001" }).lean();
  esperar(enLaBase.inStock, true, "stock guardado al reponer");
});

await check("Después de importar se refrescan los precios guardados", async () => {
  await productModel.updateOne({ productCode: "10234" }, { $set: { priceARS: 10000 } });
  const n = await recalcularCombosGuardados();
  if (n < 1) throw new Error("no actualizó ningún combo");
  const enLaBase = await productModel.findOne({ productCode: "COMBO-001" }).lean();
  esperar(enLaBase.priceARS, 26000, "precio guardado");
  await productModel.updateOne({ productCode: "10234" }, { $set: { priceARS: 8000 } });
  await recalcularCombosGuardados();
});

console.log("\nEl pedido: una línea, con los códigos de cada pieza");
console.log("─".repeat(50));

let pedido;

await check("El pedido cotiza el combo del lado servidor", async () => {
  const res = await llamar(createOrder, {
    body: {
      // Precio mentido a propósito: el servidor no tiene que creerle al navegador.
      products: [{ productId: combo._id, quantity: 1, priceARS: 1 }],
      customerName: "Juan Técnico",
      customerPhone: "1122334455",
    },
  });
  esperar(res.statusCode, 201, "status");
  pedido = res.body.order;
  esperar(pedido.totalARS, PRECIO_ESPERADO, "total");
  esperar(pedido.products.length, 1, "líneas del pedido");
  return `una línea de $${pedido.totalARS}`;
});

await check("El WhatsApp trae el combo en una línea Y cada pieza con su código", async () => {
  const res = await llamar(createOrder, {
    body: {
      products: [{ productId: combo._id, quantity: 1 }],
      customerName: "Juan Técnico",
      customerPhone: "1122334455",
    },
  });
  const texto = textoDelPedido(res.body.waLink);
  if (!texto.includes("Combo instalación split 3500W")) throw new Error("falta el combo");
  if (!texto.includes("COMBO-001")) throw new Error("falta el código del combo");
  for (const { productCode, name } of PIEZAS.slice(0, 3)) {
    if (!texto.includes(productCode)) throw new Error(`falta el código ${productCode}`);
    if (!texto.includes(name)) throw new Error(`falta el nombre ${name}`);
  }
  // El precio es UNO solo: las piezas van sin precio para que no haya dos
  // totales distintos en el mismo mensaje.
  const lineasDePieza = texto.split("\n").filter((l) => l.includes("↳"));
  esperar(lineasDePieza.length, 3, "líneas de pieza");
  if (lineasDePieza.some((l) => /ARS/.test(l))) {
    throw new Error("una pieza salió con precio: son dos totales en el mismo mensaje");
  }
  return lineasDePieza[0].trim();
});

await check("Pidiendo 2 combos, el detalle dice las piezas TOTALES", async () => {
  const res = await llamar(createOrder, {
    body: {
      products: [{ productId: combo._id, quantity: 2 }],
      customerName: "Juan Técnico",
      customerPhone: "1122334455",
    },
  });
  const texto = textoDelPedido(res.body.waLink);
  // 2 combos × 2 caños = 4 caños, que es el número que se carga en el sistema.
  if (!/4× CAÑO 1\/4 X 1MT/.test(texto)) {
    throw new Error(`esperaba 4 caños:\n${texto}`);
  }
  if (!/2× AISLANTE/.test(texto)) throw new Error("las cantidades de 1 no se multiplicaron");
  esperar(res.body.order.totalARS, PRECIO_ESPERADO * 2, "total");
  return "4× caño, 2× aislante, 2× tornillos";
});

await check("El pedido guarda la foto de las piezas, no una referencia", async () => {
  const guardado = await orderModel.findById(pedido._id).lean();
  const comp = guardado.products[0].componentes;
  esperar(comp.length, 3, "piezas guardadas");
  esperar(comp[0].productCode, "10234", "código");
  esperar(comp[0].quantity, 2, "cantidad");

  // Se le cambia la composición al combo: el presupuesto viejo tiene que seguir
  // diciendo lo que se pidió ese día.
  await llamar(actualizarCombo, {
    params: { id: String(combo._id) },
    body: { componentes: [{ productCode: "10234", quantity: 1 }, { productCode: "10999", quantity: 5 }] },
  });
  const otraVez = await orderModel.findById(pedido._id).lean();
  esperar(otraVez.products[0].componentes.length, 3, "el pedido viejo cambió");
  esperar(otraVez.products[0].componentes[0].quantity, 2, "la cantidad vieja cambió");

  // Se deja el combo como estaba para las pruebas que siguen.
  await llamar(actualizarCombo, {
    params: { id: String(combo._id) },
    body: { componentes: COMPONENTES },
  });
  return "el presupuesto de ayer sigue siendo el de ayer";
});

await check("Un combo sin stock se rechaza, diciendo qué pieza falta", async () => {
  await productModel.updateOne({ productCode: "10567" }, { $set: { inStock: false } });
  const res = await llamar(createOrder, {
    body: {
      products: [{ productId: combo._id, quantity: 1 }],
      customerName: "Juan Técnico",
      customerPhone: "1122334455",
    },
  });
  esperar(res.statusCode, 400, "status");
  const motivo = res.body.descartados?.[0]?.motivo || "";
  if (!/AISLANTE/.test(motivo)) throw new Error(`el motivo no dice qué falta: "${motivo}"`);
  await productModel.updateOne({ productCode: "10567" }, { $set: { inStock: true } });
  return `"${motivo}"`;
});

await check("El descuento service se aplica sobre el total del combo", async () => {
  const tecnico = await serviceUserModel.create({
    name: "Juan Técnico",
    email: "juan@tecnico.test",
    password: "no-se-usa",
    approved: true,
  });
  const token = jwt.sign(
    { id: String(tecnico._id), role: "service", tv: 0 },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" }
  );
  const res = await llamar(createOrder, {
    headers: { authorization: `Bearer ${token}` },
    body: {
      products: [{ productId: combo._id, quantity: 1 }],
      customerName: "Juan Técnico",
      customerPhone: "1122334455",
    },
  });
  esperar(res.statusCode, 201, "status");
  // 10% sobre la suma de las piezas, no sobre un precio propio del combo.
  esperar(res.body.order.totalARS, Math.round(PRECIO_ESPERADO * 0.9), "total con descuento");
  return `$${res.body.order.totalARS} en vez de $${PRECIO_ESPERADO}`;
});

console.log("\nQué no se puede armar");
console.log("─".repeat(50));

await check("Un combo adentro de otro se rechaza", async () => {
  const res = await llamar(crearCombo, {
    body: {
      name: "Combo de combos",
      productCode: "COMBO-002",
      componentes: [{ productCode: "COMBO-001", quantity: 1 }, { productCode: "10234", quantity: 1 }],
    },
  });
  esperar(res.statusCode, 400, "status");
  if (!/adentro de otro/.test(res.body.message)) {
    throw new Error(`mensaje poco claro: "${res.body.message}"`);
  }
  return `"${res.body.message}"`;
});

await check("Un combo que se incluye a sí mismo se rechaza", async () => {
  const res = await llamar(crearCombo, {
    body: {
      name: "Combo ouroboros",
      productCode: "COMBO-003",
      componentes: [{ productCode: "COMBO-003", quantity: 1 }, { productCode: "10234", quantity: 1 }],
    },
  });
  esperar(res.statusCode, 400, "status");
  if (!/sí mismo/.test(res.body.message)) throw new Error(res.body.message);
});

await check("Un combo con una sola pieza se rechaza", async () => {
  const res = await llamar(crearCombo, {
    body: { name: "No es combo", productCode: "COMBO-004", componentes: [{ productCode: "10234", quantity: 3 }] },
  });
  esperar(res.statusCode, 400, "status");
  if (!/al menos 2/.test(res.body.message)) throw new Error(res.body.message);
  return "eso es un producto, no un combo";
});

await check("Una pieza que no está en el catálogo se rechaza", async () => {
  const res = await llamar(crearCombo, {
    body: {
      name: "Combo fantasma",
      productCode: "COMBO-005",
      componentes: [{ productCode: "99999", quantity: 1 }, { productCode: "10234", quantity: 1 }],
    },
  });
  esperar(res.statusCode, 400, "status");
  if (!/99999/.test(res.body.message)) throw new Error("no dice qué código no existe");
  return `"${res.body.message}"`;
});

await check("La misma pieza dos veces se rechaza con un mensaje claro", async () => {
  const res = await llamar(crearCombo, {
    body: {
      name: "Combo repetido",
      productCode: "COMBO-006",
      componentes: [{ productCode: "10234", quantity: 1 }, { productCode: "10234", quantity: 2 }],
    },
  });
  esperar(res.statusCode, 400, "status");
  if (!/dos veces/.test(res.body.message)) throw new Error(res.body.message);
});

await check("Un código repetido no pisa un producto existente", async () => {
  const res = await llamar(crearCombo, {
    body: { name: "Combo chocado", productCode: "10234", componentes: COMPONENTES },
  });
  esperar(res.statusCode, 409, "status");
  const pieza = await productModel.findOne({ productCode: "10234" }).lean();
  esperar(pieza.name, "CAÑO 1/4 X 1MT", "el producto original se pisó");
});

await check("Editar como combo un producto del contable se rechaza", async () => {
  const pieza = await productModel.findOne({ productCode: "10234" }).lean();
  const res = await llamar(actualizarCombo, {
    params: { id: String(pieza._id) },
    body: { componentes: COMPONENTES },
  });
  esperar(res.statusCode, 400, "status");
  return "sería una forma silenciosa de reescribirle el precio";
});

console.log("\nEl panel");
console.log("─".repeat(50));

await check("Cotizar sin guardar devuelve el precio y qué falta", async () => {
  const res = await llamar(cotizarCombo, { body: { componentes: COMPONENTES } });
  esperar(res.statusCode, 200, "status");
  esperar(res.body.priceARS, PRECIO_ESPERADO, "precio");
  esperar(res.body.componentesDetalle.length, 3, "detalle");
  const cuantos = await productModel.countDocuments({ productCode: "COMBO-007" });
  esperar(cuantos, 0, "guardó algo sin que se lo pidieran");
  return "es lo que muestra el precio en vivo mientras lo arma";
});

await check("El listado del panel trae el precio y el estado de cada combo", async () => {
  const res = await llamar(listarCombos);
  esperar(res.statusCode, 200, "status");
  esperar(res.body.combos.length, 1, "combos");
  esperar(res.body.combos[0].priceARS, PRECIO_ESPERADO, "precio");
  esperar(esCombo(res.body.combos[0]), true, "no lo reconoce como combo");
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
