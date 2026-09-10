import mongoose from "mongoose";

/**
 * Visitas al sitio, contadas por el propio servidor.
 *
 * Qué se guarda: la ruta, de qué canal llegó (google, whatsapp, directo…) y un
 * identificador de sesión aleatorio. Qué NO se guarda: IP, user-agent, ni nada
 * que identifique a una persona. El identificador vive en sessionStorage, o sea
 * que muere al cerrar la pestaña y no permite seguir a nadie entre visitas.
 *
 * Se hace del lado servidor a propósito: los bloqueadores de publicidad tapan
 * Google Analytics para una porción de los visitantes, y esto no.
 */
const pageViewSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    // Canal de origen ya normalizado (nunca la URL completa, que puede traer
    // parámetros con datos de la persona).
    canal: { type: String, default: "directo" },
    // Sesión, para poder distinguir "visitas" de "páginas vistas".
    sid: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Se borra sola a los 180 días.
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
pageViewSchema.index({ createdAt: -1, sid: 1 });
pageViewSchema.index({ path: 1, createdAt: -1 });

export default mongoose.model("PageView", pageViewSchema);
