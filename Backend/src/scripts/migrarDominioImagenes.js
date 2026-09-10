/**
 * Cambia el dominio de las URLs de imagen guardadas en la base.
 *
 * Hace falta porque las imágenes se guardan como URL absoluta (el bucket viejo
 * quedó escrito adentro de cada producto), así que conectar un dominio propio a
 * R2 no alcanza: hay que reescribir lo ya guardado.
 *
 * Uso:
 *   node src/scripts/migrarDominioImagenes.js <VIEJO> <NUEVO>
 *   node src/scripts/migrarDominioImagenes.js <VIEJO> <NUEVO> --aplicar
 *
 * Sin --aplicar solo muestra qué cambiaría. Es reversible: para volver atrás se
 * corre de nuevo invirtiendo los dominios.
 *
 * Ejemplo:
 *   node src/scripts/migrarDominioImagenes.js \
 *     https://pub-849b8cc3f0554d009b9c665fefdaf154.r2.dev \
 *     https://img.refrigeracionayp.com --aplicar
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
// Se lee MONGO_URI directo y NO se importa config.js: ese módulo usa commander,
// que parsea process.argv y rechaza los argumentos de este script.
dotenv.config({ path: "./src/config/.env.production" });
dotenv.config({ path: "./src/config/.env.development" });
import Product from "../services/models/productModel.js";
import Banner from "../services/models/bannerModel.js";
import SiteConfig from "../services/models/siteConfigModel.js";

const [, , viejoRaw, nuevoRaw, ...flags] = process.argv;
const aplicar = flags.includes("--aplicar");

if (!viejoRaw || !nuevoRaw) {
  console.error(
    "\nFaltan los dominios.\n\n" +
      "  node src/scripts/migrarDominioImagenes.js <VIEJO> <NUEVO> [--aplicar]\n"
  );
  process.exit(1);
}

const viejo = viejoRaw.replace(/\/+$/, "");
const nuevo = nuevoRaw.replace(/\/+$/, "");

if (!/^https:\/\//.test(viejo) || !/^https:\/\//.test(nuevo)) {
  console.error("Los dos dominios tienen que empezar con https://");
  process.exit(1);
}

// Escapado para que el dominio no se interprete como expresión regular.
const rxViejo = new RegExp(`^${viejo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

async function migrar(Modelo, campo, etiqueta) {
  const docs = await Modelo.find({ [campo]: { $regex: rxViejo } })
    .select(`_id ${campo}`)
    .lean();

  if (!docs.length) {
    console.log(`  ${etiqueta}: nada que cambiar`);
    return 0;
  }

  console.log(`  ${etiqueta}: ${docs.length} a actualizar`);
  console.log(`    ej. ${docs[0][campo]}`);
  console.log(`     →  ${docs[0][campo].replace(rxViejo, nuevo)}`);

  if (!aplicar) return docs.length;

  const ops = docs.map((d) => ({
    updateOne: {
      filter: { _id: d._id },
      update: { $set: { [campo]: d[campo].replace(rxViejo, nuevo) } },
    },
  }));
  const r = await Modelo.bulkWrite(ops, { ordered: false });
  console.log(`    actualizados: ${r.modifiedCount}`);
  return r.modifiedCount;
}

(async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error(
      "\nFalta MONGO_URI. Pasala en el comando:\n" +
        '  MONGO_URI="mongodb+srv://..." node src/scripts/migrarDominioImagenes.js <VIEJO> <NUEVO>\n'
    );
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  console.log(`\nDe:  ${viejo}\nA:   ${nuevo}`);
  console.log(aplicar ? "\nAPLICANDO CAMBIOS\n" : "\nSimulación (agregá --aplicar para escribir)\n");

  let total = 0;
  total += await migrar(Product, "image", "Productos");
  total += await migrar(Banner, "image", "Banners");
  total += await migrar(SiteConfig, "heroImage", "Imagen del hero");

  console.log(
    aplicar
      ? `\nListo: ${total} registros actualizados.\n`
      : `\n${total} registros cambiarían. Volvé a correrlo con --aplicar.\n`
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error("\nError:", e.message, "\n");
  process.exitCode = 1;
});
