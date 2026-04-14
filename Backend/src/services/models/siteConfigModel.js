import mongoose from "mongoose";

const siteConfigSchema = new mongoose.Schema(
  {
    // ── Hero ──────────────────────────────────────────────────
    heroImage:     { type: String, default: "" },          // URL imagen de fondo (opcional)
    heroBadge:     { type: String, default: "Stock permanente · Buenos Aires" },
    heroTitle:     { type: String, default: "Repuestos para" },
    heroHighlight: { type: String, default: "Refrigeración" },
    heroSubtitle:  { type: String, default: "Distribuidora oficial. Más de 2000 productos para el técnico profesional." },
    heroCTA1:      { type: String, default: "Ver Catálogo →" },
    heroCTA2:      { type: String, default: "Precio Service" },
    // ── Stats del hero ─────────────────────────────────────────
    stat1Title: { type: String, default: "PRODUCTOS" },
    stat1Value: { type: String, default: "2k+" },
    stat1Label: { type: String, default: "En catálogo" },
    stat2Title: { type: String, default: "PRECIO SERVICE" },
    stat2Value: { type: String, default: "-10%" },
    stat2Label: { type: String, default: "Para técnicos matriculados" },
    // ── Tarjetas de info rápida ────────────────────────────────
    infoCards: {
      type: [
        {
          title: { type: String, default: "" },
          desc:  { type: String, default: "" },
        },
      ],
      default: [
        { title: "Envíos rápidos",  desc: "A todo el país" },
        { title: "WhatsApp",        desc: "Cotizá al instante" },
        { title: "Precio service",  desc: "10% de descuento" },
        { title: "Horario",         desc: "Lun-Vie 8 a 18hs" },
      ],
    },
    // ── Quiénes somos ──────────────────────────────────────────
    aboutTitle: { type: String, default: "¿Quiénes somos?" },
    aboutText: {
      type: String,
      default: "A&P Refrigeración es un distribuidor mayorista de repuestos y equipos de refrigeración comercial e industrial. Más de 10 años en el rubro, atendiendo a instaladores y técnicos de todo el país.",
    },
    // ── Contacto ───────────────────────────────────────────────
    address:  { type: String, default: "Dirección del local, Ciudad, Provincia" },
    phone:    { type: String, default: "+54 11 XXXX-XXXX" },
    whatsapp: { type: String, default: "" }, // número limpio para wa.me, ej: 5491112345678
    hours:    { type: String, default: "Lunes a Viernes de 8:00 a 18:00hs" },
    // ── Kit CTA ────────────────────────────────────────────────
    kitTitle:    { type: String, default: "Kit de instalación" },
    kitSubtitle: {
      type: String,
      default: "Calculá todo lo que necesitás para una instalación completa. Seleccioná los componentes y armá tu pedido en minutos.",
    },
    kitCTA: { type: String, default: "Armar mi kit →" },
  },
  { timestamps: true }
);

// Campo interno para garantizar documento único (singleton pattern)
siteConfigSchema.add({ singleton_key: { type: String, default: "main", select: false } });
siteConfigSchema.index({ singleton_key: 1 }, { unique: true, sparse: true });

export default mongoose.model("siteConfig", siteConfigSchema);
