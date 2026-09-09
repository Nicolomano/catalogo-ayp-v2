import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Permite invalidar los tokens ya emitidos: se firma dentro del JWT y `protect`
  // lo compara contra la base. Sin esto, cambiar la contraseña NO cerraba la
  // sesión de quien la hubiera robado — el token seguía válido 7 días.
  tokenVersion: { type: Number, default: 0 },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // Ver la nota de costo en serviceUserModel.js. Al cambiar la contraseña se
  // invalidan las sesiones anteriores.
  this.password = await bcrypt.hash(this.password, 11);
  this.tokenVersion = (this.tokenVersion || 0) + 1;
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
