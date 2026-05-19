import { useEffect, useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import API from "../api/axios";

const DEFAULT = {
  heroImage: "", heroBadge: "Stock permanente · Buenos Aires",
  heroTitle: "Repuestos para", heroHighlight: "Refrigeración",
  heroSubtitle: "Distribuidora oficial. Más de 2000 productos para el técnico profesional.",
  heroCTA1: "Ver productos →", heroCTA2: "Precio Service",
  stat1Title: "PRODUCTOS", stat1Value: "2k+", stat1Label: "En tienda",
  stat2Title: "PRECIO SERVICE", stat2Value: "-10%", stat2Label: "Para técnicos matriculados",
  infoCards: [
    { title: "Envíos rápidos", desc: "A todo el país" },
    { title: "WhatsApp", desc: "Cotizá al instante" },
    { title: "Precio service", desc: "10% de descuento" },
    { title: "Horario", desc: "Lun-Vie 8 a 18hs" },
  ],
  aboutTitle: "¿Quiénes somos?", aboutText: "",
  address: "", phone: "", whatsapp: "", hours: "", email: "", mapsEmbed: "",
  kitTitle: "Kit de instalación", kitSubtitle: "", kitCTA: "Armar mi kit →",
  maintenanceMode: false,
};

const inputCls = "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{hint}</p>}
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bento p-6 space-y-4" style={{ borderRadius: "16px" }}>
      <h2 className="text-base font-bold pb-2 border-b" style={{ color: "var(--text)", borderColor: "var(--border)" }}>{title}</h2>
      {children}
    </div>
  );
}

export default function AdminLanding() {
  const [config, setConfig]       = useState(DEFAULT);
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]             = useState(null);
  const [preview, setPreview]     = useState(null);
  const fileRef                   = useRef();

  useEffect(() => {
    API.get("/site-config").then((r) => setConfig((p) => ({ ...p, ...r.data }))).catch(() => {});
  }, []);

  const set = (field, value) => setConfig((p) => ({ ...p, [field]: value }));

  const setCard = (i, field, value) =>
    setConfig((p) => {
      const cards = [...(p.infoCards || [])];
      cards[i] = { ...cards[i], [field]: value };
      return { ...p, infoCards: cards };
    });

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await API.post("/site-config/hero-image", fd);
      set("heroImage", data.url);
      setMsg({ type: "ok", text: "Imagen subida correctamente." });
    } catch {
      setMsg({ type: "err", text: "Error al subir la imagen." });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    setPreview(null);
    set("heroImage", "");
    await API.put("/site-config", { heroImage: "" }).catch(() => {});
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      await API.put("/site-config", config);
      setMsg({ type: "ok", text: "¡Cambios guardados!" });
    } catch {
      setMsg({ type: "err", text: "Error al guardar. Intentá de nuevo." });
    } finally {
      setSaving(false); }
  };

  const currentImage = preview || config.heroImage;

  return (
    <div className="max-w-3xl space-y-6">

      {/* Modo mantenimiento */}
      <div
        className="bento p-5 flex items-center justify-between gap-4"
        style={{
          borderRadius: "16px",
          borderColor: config.maintenanceMode ? "#ef4444" : "var(--border)",
          borderWidth: config.maintenanceMode ? "2px" : "1px",
        }}
      >
        <div>
          <p className="font-semibold text-sm" style={{ color: config.maintenanceMode ? "#ef4444" : "var(--text)" }}>
            {config.maintenanceMode ? "🔒 Modo mantenimiento ACTIVO" : "Modo mantenimiento"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            {config.maintenanceMode
              ? "Los visitantes ven una página \"en construcción\". Solo vos (admin) podés acceder al sitio."
              : "Cuando está activo, los visitantes ven una página \"en construcción\" en lugar del sitio."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("maintenanceMode", !config.maintenanceMode)}
          className="relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200"
          style={{ background: config.maintenanceMode ? "#ef4444" : "var(--border)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: config.maintenanceMode ? "translateX(24px)" : "translateX(0)" }}
          />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Página de inicio</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Editá el contenido visible en la landing</p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--brand)" }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${msg.type === "ok" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* HERO */}
      <Section title="Hero principal">

        {/* Preview mini del hero */}
        <div className="relative rounded-2xl overflow-hidden h-36 flex items-center px-6"
          style={{ background: currentImage ? `linear-gradient(rgba(0,26,128,0.75), rgba(0,51,204,0.75)), url(${currentImage}) center/cover` : "var(--hero-grad)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">
              {config.heroBadge}
            </p>
            <p className="text-lg font-black text-white leading-tight">
              {config.heroTitle}<br/>
              <span style={{ color: "#99BBFF" }}>{config.heroHighlight}</span>
            </p>
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center gap-1">
              <Upload className="h-3 w-3" />
              {uploading ? "Subiendo…" : currentImage ? "Cambiar foto" : "Agregar foto"}
            </button>
            {currentImage && (
              <button onClick={removeImage}
                className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-red-500/60 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          La foto se muestra detrás del gradiente azul. Recomendado: horizontal, mínimo 1200px de ancho.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Badge (etiqueta pequeña)">
            <input className={inputCls} style={inputStyle} value={config.heroBadge} onChange={(e) => set("heroBadge", e.target.value)} />
          </Field>
          <Field label="Título (línea 1)">
            <input className={inputCls} style={inputStyle} value={config.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} />
          </Field>
          <Field label="Título destacado (línea 2, en celeste)">
            <input className={inputCls} style={inputStyle} value={config.heroHighlight} onChange={(e) => set("heroHighlight", e.target.value)} />
          </Field>
          <Field label="Subtítulo">
            <input className={inputCls} style={inputStyle} value={config.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} />
          </Field>
          <Field label="Botón principal">
            <input className={inputCls} style={inputStyle} value={config.heroCTA1} onChange={(e) => set("heroCTA1", e.target.value)} />
          </Field>
          <Field label="Botón secundario">
            <input className={inputCls} style={inputStyle} value={config.heroCTA2} onChange={(e) => set("heroCTA2", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* STATS */}
      <Section title="Estadísticas (las dos tarjetas al lado del hero)">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Tarjeta clara</p>
            <Field label="Etiqueta superior"><input className={inputCls} style={inputStyle} value={config.stat1Title} onChange={(e) => set("stat1Title", e.target.value)} /></Field>
            <Field label="Número grande"><input className={inputCls} style={inputStyle} value={config.stat1Value} onChange={(e) => set("stat1Value", e.target.value)} /></Field>
            <Field label="Descripción"><input className={inputCls} style={inputStyle} value={config.stat1Label} onChange={(e) => set("stat1Label", e.target.value)} /></Field>
          </div>
          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Tarjeta oscura</p>
            <Field label="Etiqueta superior"><input className={inputCls} style={inputStyle} value={config.stat2Title} onChange={(e) => set("stat2Title", e.target.value)} /></Field>
            <Field label="Número grande"><input className={inputCls} style={inputStyle} value={config.stat2Value} onChange={(e) => set("stat2Value", e.target.value)} /></Field>
            <Field label="Descripción"><input className={inputCls} style={inputStyle} value={config.stat2Label} onChange={(e) => set("stat2Label", e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      {/* INFO CARDS */}
      <Section title="Tarjetas de información (4 íconos)">
        <div className="grid sm:grid-cols-2 gap-3">
          {(config.infoCards || []).map((card, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Tarjeta {i + 1}</p>
              <Field label="Título"><input className={inputCls} style={inputStyle} value={card.title} onChange={(e) => setCard(i, "title", e.target.value)} /></Field>
              <Field label="Descripción"><input className={inputCls} style={inputStyle} value={card.desc} onChange={(e) => setCard(i, "desc", e.target.value)} /></Field>
            </div>
          ))}
        </div>
      </Section>

      {/* QUIÉNES SOMOS */}
      <Section title="¿Quiénes somos?">
        <Field label="Título">
          <input className={inputCls} style={inputStyle} value={config.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} />
        </Field>
        <Field label="Texto">
          <textarea rows={4} className={inputCls} style={inputStyle} value={config.aboutText} onChange={(e) => set("aboutText", e.target.value)} />
        </Field>
      </Section>

      {/* CONTACTO */}
      <Section title="Información de contacto">
        <Field label="Dirección"><input className={inputCls} style={inputStyle} value={config.address} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="Teléfono (display)"><input className={inputCls} style={inputStyle} value={config.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="WhatsApp (botón flotante)" hint="Número limpio para wa.me, sin +, sin espacios. Ej: 5491112345678">
          <input
            className={inputCls} style={inputStyle}
            placeholder="5491112345678"
            value={config.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
          />
        </Field>
        <Field label="Horario"><input className={inputCls} style={inputStyle} value={config.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
        <Field label="Email de contacto"><input className={inputCls} style={inputStyle} value={config.email} onChange={(e) => set("email", e.target.value)} placeholder="info@ejemplo.com" /></Field>
        <Field label="URL del iframe de Google Maps" hint="Abrí Google Maps → Compartir → Insertar mapa → copiá la URL del src del iframe">
          <textarea rows={2} className={inputCls} style={inputStyle} value={config.mapsEmbed} onChange={(e) => set("mapsEmbed", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
        </Field>
      </Section>

      {/* KIT */}
      <Section title="Kit de instalación">
        <Field label="Título"><input className={inputCls} style={inputStyle} value={config.kitTitle} onChange={(e) => set("kitTitle", e.target.value)} /></Field>
        <Field label="Descripción">
          <textarea rows={3} className={inputCls} style={inputStyle} value={config.kitSubtitle} onChange={(e) => set("kitSubtitle", e.target.value)} />
        </Field>
        <Field label="Texto del botón"><input className={inputCls} style={inputStyle} value={config.kitCTA} onChange={(e) => set("kitCTA", e.target.value)} /></Field>
      </Section>

      <div className="flex justify-end pb-8">
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          style={{ background: "var(--brand)" }}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
