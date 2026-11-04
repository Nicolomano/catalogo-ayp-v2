/**
 * Copia de seguridad de la base, a un archivo JSON.
 *
 * Existe porque el plan gratuito de MongoDB Atlas no hace backups automáticos, y
 * el import de Excel es una operación destructiva que no se puede deshacer.
 *
 * No alcanza con guardar el Excel del contable: las URLs de las fotos viven solo
 * en la base (se suben a R2 y el enlace queda en cada producto), así que
 * reimportar el Excel devolvería los productos SIN imágenes.
 *
 * Uso:
 *   MONGO_URI="mongodb+srv://..." node src/scripts/backup.js
 *   MONGO_URI="..." node src/scripts/backup.js --salida "D:/backups"
 *
 * Restaurar (pide confirmación explícita):
 *   MONGO_URI="..." node src/scripts/backup.js --restaurar backups/2026-09-12.json --confirmar
 *
 * Para restaurar, MONGO_URI tiene que venir escrita en el comando: no se toma
 * de los archivos .env, para no restaurar sobre producción sin querer.
 *
 * El archivo va en Extended JSON (EJSON), no en JSON común: el JSON común guarda
 * los ObjectId y las fechas como texto, y al restaurar no coincidía ningún _id
 * (duplicaba todo) y las referencias entre colecciones quedaban rotas.
 *
 * OJO: el archivo tiene datos personales (teléfonos de clientes, CUIT de
 * técnicos). Guardalo en un lugar privado y NO lo subas al repositorio.
 */
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const { EJSON } = mongoose.mongo.BSON;
// Formato canónico: conserva también si un número era entero o decimal.
const EJSON_OPCIONES = { relaxed: false };
const FORMATO = "ejson-v1";

// Antes de leer los .env: para restaurar solo vale la que se escribió a mano.
const uriEscritaAMano = process.env.MONGO_URI;

// No se importa config.js: usa commander, que rechaza los argumentos de acá.
dotenv.config({ path: "./src/config/.env.production" });
dotenv.config({ path: "./src/config/.env.development" });

// Telemetría: se regenera sola y tiene vencimiento automático. No se respalda.
const EXCLUIDAS = new Set(["searchlogs", "pageviews", "sessions"]);

const args = process.argv.slice(2);
const valorDe = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const restaurarDesde = valorDe("--restaurar");
const confirmado = args.includes("--confirmar");
const reemplazar = args.includes("--reemplazar");
const salida = valorDe("--salida") || "backups";

// Se valida antes de conectar: no tiene sentido abrir la base para después
// descubrir que el archivo no está.
if (restaurarDesde && !fs.existsSync(restaurarDesde)) {
  console.error(`\nNo encuentro el archivo: ${restaurarDesde}\n`);
  process.exit(1);
}

if (restaurarDesde && !uriEscritaAMano) {
  console.error(
    "\nPara restaurar, escribí MONGO_URI en el mismo comando (no se toma de los .env):\n" +
      '  MONGO_URI="mongodb+srv://..." node src/scripts/backup.js --restaurar ARCHIVO\n'
  );
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error(
    '\nFalta MONGO_URI.\n  MONGO_URI="mongodb+srv://..." node src/scripts/backup.js\n'
  );
  process.exit(1);
}

const kb = (n) => `${Math.round(n / 1024).toLocaleString("es-AR")} KB`;

async function hacerBackup(db) {
  const colecciones = (await db.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !EXCLUIDAS.has(n) && !n.startsWith("system."))
    .sort();

  const datos = {};
  console.log("");
  for (const nombre of colecciones) {
    const docs = await db.collection(nombre).find({}).toArray();
    datos[nombre] = docs;
    console.log(`  ${nombre.padEnd(20)} ${String(docs.length).padStart(6)} documentos`);
  }

  const carpeta = path.resolve(salida);
  fs.mkdirSync(carpeta, { recursive: true });
  const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const archivo = path.join(carpeta, `backup-${sello}.json`);

  const contenido = EJSON.stringify(
    { formato: FORMATO, fecha: new Date().toISOString(), datos },
    EJSON_OPCIONES
  );
  fs.writeFileSync(archivo, contenido);

  console.log(`\n  Guardado en: ${archivo}`);
  console.log(`  Tamaño: ${kb(Buffer.byteLength(contenido))}\n`);
  console.log("  Copialo a un lugar seguro (Drive, disco externo).");
  console.log("  Tiene datos personales: no lo subas al repositorio.\n");
}

async function restaurar(db) {
  const { formato, fecha, datos } = EJSON.parse(
    fs.readFileSync(restaurarDesde, "utf8"),
    EJSON_OPCIONES
  );
  // Los backups hechos antes del arreglo tienen los _id y las fechas como texto:
  // restaurarlos duplicaría los documentos en vez de recuperarlos.
  if (formato !== FORMATO) {
    console.error(
      "\n  Este backup es del formato viejo (JSON común) y no se puede restaurar bien:\n" +
        "  los _id y las fechas quedaron guardados como texto. Hacé un backup nuevo.\n"
    );
    process.exitCode = 1;
    return;
  }

  // Solo el servidor, sin usuario ni contraseña.
  const destino = mongoUri.replace(/^mongodb(\+srv)?:\/\/([^@/]*@)?/, "").split(/[/?]/)[0];
  console.log(`\n  Base de destino: ${destino}`);
  console.log(`  Backup del ${new Date(fecha).toLocaleString("es-AR")}`);
  for (const [nombre, docs] of Object.entries(datos)) {
    console.log(`  ${nombre.padEnd(20)} ${String(docs.length).padStart(6)} documentos`);
  }

  if (!confirmado) {
    console.log(
      "\n  Simulación: no se escribió nada.\n" +
        "  Para aplicarlo agregá --confirmar.\n" +
        "  Por defecto solo agrega y actualiza; con --reemplazar además borra\n" +
        "  lo que hoy exista y no esté en el backup.\n"
    );
    return;
  }

  console.log(reemplazar ? "\n  RESTAURANDO (modo reemplazo)\n" : "\n  RESTAURANDO\n");
  for (const [nombre, docs] of Object.entries(datos)) {
    const col = db.collection(nombre);
    if (reemplazar) await col.deleteMany({});
    if (!docs.length) continue;
    // En lotes: un bulkWrite con miles de operaciones puede pasarse del límite.
    for (let i = 0; i < docs.length; i += 500) {
      const lote = docs.slice(i, i + 500).map((d) => ({
        replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
      }));
      await col.bulkWrite(lote, { ordered: false });
    }
    console.log(`  ${nombre.padEnd(20)} restaurada`);
  }
  console.log("\n  Listo.\n");
}

(async () => {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (restaurarDesde) await restaurar(db);
  else await hacerBackup(db);
  await mongoose.disconnect();
})().catch((e) => {
  console.error("\nError:", e.message, "\n");
  process.exitCode = 1;
});
