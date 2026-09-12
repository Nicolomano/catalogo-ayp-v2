/**
 * Cambia la contraseña de un administrador.
 *
 * Existe porque `seedAdmin.js` NO sirve para esto: si el admin ya existe, avisa
 * "ya existe, no se hicieron cambios" y no toca nada. Y el panel no tiene
 * recuperación de contraseña para administradores, así que sin este script la
 * única salida era editar la base a mano.
 *
 * Uso:
 *   MONGO_URI="mongodb+srv://..." node src/scripts/resetAdminPassword.js <usuario> <contraseña-nueva>
 *
 * Al cambiarla se cierran todas las sesiones abiertas de ese admin, en todos los
 * dispositivos (el modelo sube tokenVersion al guardar).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
// No se importa config.js: usa commander, que rechaza los argumentos de acá.
dotenv.config({ path: "./src/config/.env.production" });
dotenv.config({ path: "./src/config/.env.development" });
import userModel from "../services/models/userModel.js";

const MIN = 12;

export async function resetearPassword(username, nuevaPassword) {
  const user = await userModel.findOne({ username });
  if (!user) return { ok: false, motivo: "no-existe" };

  // save() y no findByIdAndUpdate: el hook pre("save") es el que hashea la
  // contraseña y sube tokenVersion. Con un update directo se guardaría en texto
  // plano y el login dejaría de funcionar sin dar ningún error.
  user.password = nuevaPassword;
  await user.save();
  return { ok: true, tokenVersion: user.tokenVersion };
}

// Solo corre si se ejecuta directo, no cuando lo importa un test.
if (process.argv[1] && process.argv[1].endsWith("resetAdminPassword.js")) {
  const [, , username, nueva] = process.argv;

  if (!username || !nueva) {
    console.error(
      "\nFaltan datos.\n\n" +
        '  MONGO_URI="..." node src/scripts/resetAdminPassword.js <usuario> <contraseña-nueva>\n'
    );
    process.exit(1);
  }
  if (nueva.length < MIN) {
    console.error(`\nLa contraseña debe tener al menos ${MIN} caracteres.\n`);
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error('\nFalta MONGO_URI.\n  MONGO_URI="mongodb+srv://..." node ...\n');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const r = await resetearPassword(username, nueva);

  if (!r.ok) {
    const todos = await userModel.find().select("username").lean();
    console.error(`\nNo existe el administrador "${username}".`);
    console.error(
      todos.length
        ? `Administradores en la base: ${todos.map((u) => u.username).join(", ")}\n`
        : "No hay ningún administrador cargado. Usá seedAdmin.js para crear el primero.\n"
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\n✅ Contraseña de "${username}" actualizada.`);
  console.log("   Se cerraron las sesiones abiertas en todos los dispositivos.\n");
  await mongoose.disconnect();
}
