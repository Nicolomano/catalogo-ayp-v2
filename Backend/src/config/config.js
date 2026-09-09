import dotenv from "dotenv";
import program from "../process.js";

const environment = program.opts().mode;

dotenv.config({
  path:
    environment === "production"
      ? "./src/config/.env.production"
      : "./src/config/.env.development",
});

// Fail-fast: sin estas dos el server arrancaba igual y fallaba recién en el
// primer login ("Error en login", 500) o en la primera query. Es preferible que
// el deploy no levante a que quede a medias respondiendo errores.
const REQUERIDAS = ["MONGO_URI", "JWT_SECRET"];
const faltantes = REQUERIDAS.filter((k) => !process.env[k]);
if (faltantes.length) {
  console.error(
    `Faltan variables de entorno obligatorias: ${faltantes.join(", ")}. ` +
      `Cargalas en el panel del hosting (o en src/config/.env.${environment}).`
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn(
    "JWT_SECRET es más corto que 32 caracteres: conviene uno largo y aleatorio."
  );
}

export default {
  mongoUri: process.env.MONGO_URI,
  environment,
  jwtSecret: process.env.JWT_SECRET,
};
