import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const serviceUserSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:        { type: String, required: true },
    company:         { type: String, default: "" },
    // Ya no es obligatorio: un técnico sin inscripción puede dar solo el DNI.
    // Lo que sí se valida ahora es el dígito verificador (ver utils/identidad.js).
    cuit:            { type: String, default: "" },
    // Sale del propio CUIT/CUIL cuando lo hay; se guarda aparte para poder
    // cotejarlo y para los que solo tienen DNI.
    dni:             { type: String, default: "" },
    // Registros viejos: URL pública del bucket. Se conserva para no perder las
    // imágenes ya cargadas, pero no se escribe más.
    matriculaImage:  { type: String, default: "" },
    // Nuevos: solo la key en R2. La imagen se sirve por GET /api/users/:id/matricula
    // (protect + requireAdmin) — es un documento personal, no puede ser una URL pública.
    matriculaKey:    { type: String, default: "", select: false },
    province:        { type: String, default: "" },
    phone:           { type: String, default: "" },
    clientNumber:    { type: String, default: "" }, // assigned by admin before approval
    role:            { type: String, default: "service" },
    approved:        { type: Boolean, default: false },
    // "awaiting" = falta que el técnico mande algo (matrícula, CUIT, etc).
    // Se separa de "pending" para que la bandeja de pendientes muestre solo lo
    // que depende de nosotros, no lo que depende de ellos.
    status:          { type: String, enum: ["pending", "awaiting", "approved", "rejected"], default: "pending" },
    // Qué se le pidió. Va en el mail que se le manda y se ve en el panel.
    awaitingReason:  { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    // Recuperación de contraseña: se guarda el HASH del token, no el token. Así
    // una filtración de la base no permite resetear cuentas ajenas.
    resetTokenHash:  { type: String, default: "", select: false },
    resetTokenExp:   { type: Date, default: null, select: false },
    // Permite invalidar los JWT ya emitidos (duran 7 días). Sube al cambiar la
    // contraseña o el email, que va firmado dentro del token.
    tokenVersion:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // Costo 11, medido: ~130ms acá vs ~70ms con 10 y ~300ms con 12. bcryptjs es JS
  // puro y Node es mono-hilo, así que el hash bloquea el event loop: 12 en el
  // contenedor de Railway se iba a medio segundo por login. 11 duplica la
  // resistencia al cracking offline sin ese costo. Los hashes viejos siguen
  // validando con su propio costo embebido.
  this.password = await bcrypt.hash(this.password, 11);
  next();
});

serviceUserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("ServiceUser", serviceUserSchema);
