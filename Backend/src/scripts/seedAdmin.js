/**
 * Crea el usuario admin inicial en la base de datos.
 * Correr UNA SOLA VEZ antes de lanzar la app.
 *
 * Uso:
 *   MONGO_URI="mongodb+srv://..." ADMIN_NAME="admin" ADMIN_PASSWORD="tu_password" node src/scripts/seedAdmin.js
 *
 * O con el archivo .env.production cargado:
 *   node src/scripts/seedAdmin.js
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";
import userModel from "../services/models/userModel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../config/.env.production") });

const uri = process.env.MONGO_URI;
const username = process.env.ADMIN_NAME || "admin";
const password = process.env.ADMIN_PASSWORD;

if (!uri) {
  console.error("❌ Falta MONGO_URI");
  process.exit(1);
}
if (!password) {
  console.error("❌ Falta ADMIN_PASSWORD");
  process.exit(1);
}

await mongoose.connect(uri);
console.log("✅ Conectado a MongoDB");

const exists = await userModel.findOne({ username });
if (exists) {
  console.log(`ℹ️  El admin "${username}" ya existe. No se hicieron cambios.`);
} else {
  await new userModel({ username, password }).save();
  console.log(`✅ Admin creado: "${username}"`);
}

await mongoose.disconnect();
