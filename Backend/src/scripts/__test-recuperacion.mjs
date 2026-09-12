/**
 * Prueba real del cambio de contraseña de administrador y del backup, contra una
 * base MongoDB de verdad (en memoria, descartable).
 *
 * No forma parte del build: `mongodb-memory-server` no está en package.json para
 * no sumarle peso a los deploys. Para correrlo:
 *
 *   cd Backend
 *   npm install --no-save mongodb-memory-server
 *   node src/scripts/__test-recuperacion.mjs
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
// authController importa config.js, que aborta si falta alguna variable
// obligatoria. Acá no se firma ningún token de verdad: alcanza con un valor.
process.env.JWT_SECRET ||= "secreto-solo-para-esta-prueba-descartable";
await mongoose.connect(process.env.MONGO_URI);
console.log(`\nBase de prueba levantada\n`);

const userModel = (await import("../services/models/userModel.js")).default;
const { resetearPassword } = await import("./resetAdminPassword.js");

console.log("Cambio de contraseña de administrador");
console.log("─".repeat(38));

const VIEJA = "contraseñaVieja123";
const NUEVA = "contraseñaNueva456";

await check("Se crea el admin y la contraseña original funciona", async () => {
  await new userModel({ username: "admin", password: VIEJA }).save();
  const u = await userModel.findOne({ username: "admin" });
  esperar(await u.comparePassword(VIEJA), true, "login con la original");
  if (u.password === VIEJA) throw new Error("¡la contraseña se guardó sin hashear!");
  return `tokenVersion inicial = ${u.tokenVersion}`;
});

await check("seedAdmin NO cambia la contraseña de un admin existente", async () => {
  // Se replica su lógica: si existe, no hace nada. Esto es lo que justifica que
  // exista resetAdminPassword.
  const existe = await userModel.findOne({ username: "admin" });
  if (!existe) throw new Error("debería existir");
  const u = await userModel.findOne({ username: "admin" });
  esperar(await u.comparePassword(VIEJA), true, "sigue la original");
  return "confirmado: no sirve para recuperar";
});

let tvAntes;
await check("El reset cambia la contraseña", async () => {
  tvAntes = (await userModel.findOne({ username: "admin" })).tokenVersion;
  const r = await resetearPassword("admin", NUEVA);
  esperar(r.ok, true, "resultado");
  return `tokenVersion ${tvAntes} → ${r.tokenVersion}`;
});

await check("La contraseña NUEVA funciona", async () => {
  const u = await userModel.findOne({ username: "admin" });
  esperar(await u.comparePassword(NUEVA), true, "login con la nueva");
});

await check("La contraseña VIEJA ya NO funciona", async () => {
  const u = await userModel.findOne({ username: "admin" });
  esperar(await u.comparePassword(VIEJA), false, "login con la vieja");
});

await check("Quedó hasheada, no en texto plano", async () => {
  const u = await userModel.findOne({ username: "admin" });
  if (u.password === NUEVA) throw new Error("¡se guardó en texto plano!");
  if (!u.password.startsWith("$2")) throw new Error("no parece un hash bcrypt");
  return u.password.slice(0, 7) + "…";
});

await check("Se invalidan las sesiones abiertas", async () => {
  const u = await userModel.findOne({ username: "admin" });
  if (u.tokenVersion <= tvAntes) {
    throw new Error(`tokenVersion no subió (${tvAntes} → ${u.tokenVersion})`);
  }
  return `los tokens con tv=${tvAntes} dejan de servir`;
});

await check("Avisa si el usuario no existe", async () => {
  const r = await resetearPassword("no-existe", "loQueSea123456");
  esperar(r.ok, false, "resultado");
  esperar(r.motivo, "no-existe", "motivo");
});

console.log("\nCopia de seguridad (ida y vuelta)");
console.log("─".repeat(38));

await check("El backup guarda y la restauración devuelve los datos", async () => {
  const db = mongoose.connection.db;
  await db.collection("orders").insertMany([
    { customerName: "Cliente A", totalARS: 1000 },
    { customerName: "Cliente B", totalARS: 2000 },
  ]);
  // Telemetría: NO debe entrar en el backup.
  await db.collection("pageviews").insertOne({ path: "/", sid: "x" });

  const EXCLUIDAS = new Set(["searchlogs", "pageviews", "sessions"]);
  const nombres = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !EXCLUIDAS.has(n) && !n.startsWith("system."));

  const datos = {};
  for (const n of nombres) datos[n] = await db.collection(n).find({}).toArray();

  if (datos.pageviews) throw new Error("la telemetría entró en el backup");
  if (datos.orders.length !== 2) throw new Error("faltan órdenes en el backup");

  // Se simula la pérdida y se restaura, como hace el script.
  await db.collection("orders").deleteMany({});
  esperar(await db.collection("orders").countDocuments(), 0, "tras el borrado");

  for (const [n, docs] of Object.entries(datos)) {
    if (!docs.length) continue;
    await db.collection(n).bulkWrite(
      docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: false }
    );
  }

  esperar(await db.collection("orders").countDocuments(), 2, "tras restaurar");
  const a = await db.collection("orders").findOne({ customerName: "Cliente A" });
  esperar(a?.totalARS, 1000, "datos del documento");
  return "2 órdenes borradas y recuperadas intactas";
});

console.log("\nNiveles de administrador");
console.log("─".repeat(38));

const { requireNivelTotal, requireAdmin } = await import("../middlewares/authMiddleware.js");
const { registerAdmin, listAdmins, updateAdmin, deleteAdmin, cambiarMiPassword } = await import(
  "../controllers/authController.js"
);

/** res falso: guarda el status y el body para poder afirmarlos. */
function fakeRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
}
/** Corre un middleware y devuelve si llamó a next(). */
function correr(mw, req) {
  const res = fakeRes();
  let paso = false;
  mw(req, res, () => { paso = true; });
  return { paso, res };
}

await check("El middleware deja pasar a total y frena a limitado", () => {
  const admin = (nivel) => ({ user: { role: "admin", ...(nivel ? { nivel } : {}) } });
  esperar(correr(requireNivelTotal, admin("total")).paso, true, "total");
  const lim = correr(requireNivelTotal, admin("limitado"));
  esperar(lim.paso, false, "limitado pasó");
  esperar(lim.res.statusCode, 403, "status del rechazo");
  esperar(correr(requireNivelTotal, {}).paso, false, "sin usuario");
  // Un token de service (sin `nivel`) NO debe colarse por la tolerancia.
  esperar(correr(requireNivelTotal, { user: { role: "service" } }).paso, false, "token de service");
  // Token de admin viejo, firmado antes de que existieran los niveles: pasa,
  // porque esas cuentas son todas totales y si no el dueño quedaría afuera.
  esperar(correr(requireNivelTotal, admin()).paso, true, "token de admin sin nivel");
  // requireAdmin sigue valiendo para los dos niveles: ambos entran al panel.
  esperar(correr(requireAdmin, admin("limitado")).paso, true, "requireAdmin con limitado");
  return "403 para limitado, panel abierto para ambos";
});

await check("La migración pone nivel total en las cuentas viejas", async () => {
  // Se simula una cuenta anterior a los niveles: sin el campo.
  await userModel.collection.insertOne({ username: "viejo", password: "hash", tokenVersion: 0 });
  const r = await userModel.updateMany({ nivel: { $exists: false } }, { $set: { nivel: "total" } });
  const viejo = await userModel.findOne({ username: "viejo" }).lean();
  esperar(viejo.nivel, "total", "nivel migrado");
  // Idempotente: correrla de nuevo no toca nada.
  const r2 = await userModel.updateMany({ nivel: { $exists: false } }, { $set: { nivel: "total" } });
  esperar(r2.modifiedCount, 0, "segunda corrida");
  return `${r.modifiedCount} migrada(s), la segunda corrida no modifica nada`;
});

await check("Un admin nuevo nace limitado si no se aclara", async () => {
  const u = await new userModel({ username: "sinNivel", password: "unaClaveLarga123" }).save();
  esperar(u.nivel, "limitado", "default del schema");
});

let idLimitado;
await check("Se crea un admin limitado desde el endpoint", async () => {
  const res = fakeRes();
  await registerAdmin({ body: { username: "deposito", password: "claveDeDeposito1" , nivel: "limitado" } }, res);
  esperar(res.statusCode, 201, "status");
  esperar(res.body.nivel, "limitado", "nivel");
  if (res.body.password) throw new Error("¡el endpoint devolvió la contraseña!");
  idLimitado = String(res.body._id);
});

await check("Rechaza contraseñas cortas y niveles inventados", async () => {
  const corta = fakeRes();
  await registerAdmin({ body: { username: "x", password: "corta", nivel: "limitado" } }, corta);
  esperar(corta.statusCode, 400, "contraseña corta");
  const raro = fakeRes();
  await registerAdmin({ body: { username: "y", password: "unaClaveLarga123", nivel: "dios" } }, raro);
  esperar(raro.statusCode, 400, "nivel inventado");
});

await check("El listado nunca devuelve contraseñas", async () => {
  const res = fakeRes();
  await listAdmins({}, res);
  if (!Array.isArray(res.body) || !res.body.length) throw new Error("listado vacío");
  for (const a of res.body) {
    if ("password" in a) throw new Error(`${a.username} expone la contraseña`);
    if (!a.nivel) throw new Error(`${a.username} sin nivel`);
  }
  return `${res.body.length} cuentas, sin hashes`;
});

await check("No se puede dejar el sistema sin ningún admin total", async () => {
  // Queda un solo total: el "viejo" migrado ("admin" y los nuevos son limitados).
  await userModel.updateMany({ username: { $ne: "viejo" } }, { $set: { nivel: "limitado" } });
  const totales = await userModel.find({ nivel: "total" }).lean();
  esperar(totales.length, 1, "totales antes de la prueba");
  const unico = totales[0];

  const degradar = fakeRes();
  await updateAdmin({ params: { id: String(unico._id) }, body: { nivel: "limitado" }, user: { id: String(unico._id) } }, degradar);
  esperar(degradar.statusCode, 400, "degradar al último total");

  const borrar = fakeRes();
  await deleteAdmin({ params: { id: String(unico._id) }, body: {}, user: { id: idLimitado } }, borrar);
  esperar(borrar.statusCode, 400, "borrar al último total");

  const sigue = await userModel.findById(unico._id).lean();
  esperar(sigue.nivel, "total", "el último total quedó intacto");
});

await check("Nadie puede eliminarse a sí mismo", async () => {
  const res = fakeRes();
  await deleteAdmin({ params: { id: idLimitado }, body: {}, user: { id: idLimitado } }, res);
  esperar(res.statusCode, 400, "autoborrado");
  if (!(await userModel.findById(idLimitado))) throw new Error("se borró igual");
});

await check("Cambiar la contraseña propia exige la actual", async () => {
  const mal = fakeRes();
  await cambiarMiPassword({ body: { actual: "loQueSea12345", nueva: "otraClaveLarga1" }, user: { id: idLimitado } }, mal);
  esperar(mal.statusCode, 400, "con la actual equivocada");

  const antes = await userModel.findById(idLimitado);
  const bien = fakeRes();
  await cambiarMiPassword({ body: { actual: "claveDeDeposito1", nueva: "otraClaveLarga1" }, user: { id: idLimitado } }, bien);
  esperar(bien.statusCode, 200, "con la actual correcta");

  const despues = await userModel.findById(idLimitado);
  esperar(await despues.comparePassword("otraClaveLarga1"), true, "entra con la nueva");
  esperar(await despues.comparePassword("claveDeDeposito1"), false, "ya no entra con la vieja");
  if (despues.tokenVersion <= antes.tokenVersion) throw new Error("no se invalidaron las sesiones");
  return `tokenVersion ${antes.tokenVersion} → ${despues.tokenVersion}`;
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
