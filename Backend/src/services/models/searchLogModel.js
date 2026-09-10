import mongoose from "mongoose";

/**
 * Registro de búsquedas del catálogo.
 *
 * Guarda SOLO el término y cuántos resultados dio: sin IP, sin usuario, sin
 * sesión. No es un dato personal, así que no cambia nada de la política de
 * privacidad.
 *
 * El valor está en las búsquedas con `resultCount: 0`: para un catálogo de
 * repuestos, eso es demanda insatisfecha explícita — qué le piden y no tiene.
 */
const searchLogSchema = new mongoose.Schema(
  {
    term: { type: String, required: true },
    resultCount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Se borra solo a los 180 días para que la colección no crezca sin techo.
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
// Para agrupar por término y para aislar rápido las que no dieron resultados.
searchLogSchema.index({ term: 1 });
searchLogSchema.index({ resultCount: 1, createdAt: -1 });

export default mongoose.model("SearchLog", searchLogSchema);
