import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    /**
     * Nivel de acceso al panel:
     *  - "total":     puede todo, incluido importar Excel, borrar productos,
     *                 cambiar la configuración del sitio y administrar usuarios.
     *  - "limitado":  el día a día (productos, pedidos, técnicos, banners,
     *                 métricas), sin las acciones que pueden romper el catálogo.
     *
     * Default "limitado": un admin creado sin especificar nada nace acotado, que
     * es el lado seguro para equivocarse. Las cuentas que ya existían se migran
     * a "total" al arrancar (ver app.js).
     */
    nivel: { type: String, enum: ["total", "limitado"], default: "limitado" },
    // Permite invalidar los tokens ya emitidos: se firma dentro del JWT y `protect`
    // lo compara contra la base. Sin esto, cambiar la contraseña NO cerraba la
    // sesión de quien la hubiera robado — el token seguía válido 7 días.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

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
