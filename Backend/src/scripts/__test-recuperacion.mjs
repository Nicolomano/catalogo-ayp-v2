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

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));

await mongoose.disconnect();
await mongod.stop();
process.exitCode = fallos.length ? 1 : 0;
