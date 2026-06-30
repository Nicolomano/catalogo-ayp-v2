import { useEffect, useRef, useState } from "react";
import {
  PlusCircle, Trash2, Edit2, Upload, X, UserCheck,
  MapPin, Star, Wrench, Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../api/axios";

const inputCls = "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

const ZONES = ["GBA", "CABA", "Zona Norte", "Zona Sur", "Zona Oeste", "Interior"];
const ICON_OPTIONS = ["Wrench", "Thermometer", "Zap", "Wind", "Package", "Settings", "Shield", "Snowflake", "Clock", "UserCheck"];

const EMPTY_FORM = {
  name: "", title: "", zone: "GBA", city: "", neighborhood: "",
  specialties: [], bio: "",
  services: [],
  yearsExperience: 0, rating: 5, reviewCount: 0,
  whatsapp: "", recommended: false, active: true, order: 0,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
      style={{ background: checked ? "var(--brand)" : "var(--border)" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function SpecialtyTags({ value, onChange }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((s) => (
          <span key={s} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}>
            {s}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== s))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Agregar especialidad..."
        />
        <button type="button" onClick={add}
          className="px-3 rounded-xl text-sm font-medium transition-colors"
          style={{ background: "var(--brand-tint)", color: "var(--brand)" }}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ServicesList({ value, onChange }) {
  const add = () => onChange([...value, { title: "", desc: "", icon: "Wrench" }]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.map((svc, i) => (
        <div key={i} className="p-3 rounded-xl border space-y-2" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
          <div className="flex items-center gap-2">
            <select
              value={svc.icon}
              onChange={(e) => update(i, "icon", e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs outline-none"
              style={inputStyle}
            >
              {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input
              className={inputCls + " flex-1"}
              style={inputStyle}
              value={svc.title}
              onChange={(e) => update(i, "title", e.target.value)}
              placeholder="Título del servicio"
            />
            <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-500 flex-shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            className={inputCls}
            style={inputStyle}
            value={svc.desc}
            onChange={(e) => update(i, "desc", e.target.value)}
            placeholder="Descripción breve..."
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl w-full justify-center transition-colors"
        style={{ border: "1.5px dashed var(--border)", color: "var(--muted)" }}
      >
        <Plus className="h-4 w-4" /> Agregar servicio
      </button>
    </div>
  );
}

function WorkGallery({ tecnicoId, recentWork, onUpdate }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await API.post(`/tecnicos/${tecnicoId}/works`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUpdate(res.data.recentWork);
      toast.success("Foto agregada");
    } catch {
      toast.error("Error subiendo foto");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (idx) => {
    if (!confirm("¿Eliminar esta foto?")) return;
    try {
      const res = await API.delete(`/tecnicos/${tecnicoId}/works/${idx}`);
      onUpdate(res.data.recentWork);
      toast.success("Foto eliminada");
    } catch {
      toast.error("Error eliminando foto");
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {(recentWork || []).map((url, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "1", background: "var(--surface2)" }}>
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
              style={{ background: "rgba(220,38,38,0.85)" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {(recentWork?.length || 0) < 12 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-xl flex flex-col items-center justify-center gap-1 text-xs transition-colors"
            style={{
              aspectRatio: "1",
              border: "1.5px dashed var(--border)",
              color: "var(--muted)",
              opacity: uploading ? 0.5 : 1,
            }}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "..." : "Agregar"}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminTecnicos() {
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // null | "new" | tecnico object
  const [form, setForm]         = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving]     = useState(false);
  const photoRef = useRef(null);

  const fetchTecnicos = async () => {
    setLoading(true);
    try {
      const res = await API.get("/tecnicos/admin/all");
      setTecnicos(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Error cargando técnicos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTecnicos(); }, []);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    setEditing("new");
  };

  const openEdit = (t) => {
    setForm({
      name:            t.name            || "",
      title:           t.title           || "",
      zone:            t.zone            || "GBA",
      city:            t.city            || "",
      neighborhood:    t.neighborhood    || "",
      specialties:     t.specialties     || [],
      bio:             t.bio             || "",
      services:        t.services        || [],
      yearsExperience: t.yearsExperience || 0,
      rating:          t.rating          || 5,
      reviewCount:     t.reviewCount     || 0,
      whatsapp:        t.whatsapp        || "",
      recommended:     t.recommended     || false,
      active:          t.active          !== false,
      order:           t.order           || 0,
    });
    setPhotoFile(null);
    setPhotoPreview(t.photo || null);
    setEditing(t);
  };

  const closeEdit = () => {
    setEditing(null);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handlePhotoChange = (file) => {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.zone.trim()) {
      toast.error("Nombre y zona son requeridos");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "specialties" || k === "services") {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, v);
        }
      });
      if (photoFile) fd.append("photo", photoFile);

      if (editing === "new") {
        const res = await API.post("/tecnicos", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setTecnicos((prev) => [res.data, ...prev]);
        toast.success("Técnico creado");
      } else {
        const res = await API.put(`/tecnicos/${editing._id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        setTecnicos((prev) => prev.map((t) => t._id === editing._id ? res.data : t));
        toast.success("Técnico actualizado");
      }
      closeEdit();
    } catch {
      toast.error("Error guardando técnico");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este técnico?")) return;
    try {
      await API.delete(`/tecnicos/${id}`);
      setTecnicos((prev) => prev.filter((t) => t._id !== id));
      toast.success("Técnico eliminado");
      if (editing && editing._id === id) closeEdit();
    } catch {
      toast.error("Error eliminando técnico");
    }
  };

  const handleToggle = async (t, field) => {
    const endpoint = field === "active" ? "toggle" : "recommend";
    try {
      await API.patch(`/tecnicos/${t._id}/${endpoint}`);
      setTecnicos((prev) => prev.map((x) =>
        x._id === t._id ? { ...x, [field]: !x[field] } : x
      ));
    } catch {
      toast.error("Error actualizando");
    }
  };

  const handleGalleryUpdate = (newWork) => {
    if (editing && editing !== "new") {
      setEditing((prev) => ({ ...prev, recentWork: newWork }));
      setTecnicos((prev) => prev.map((t) =>
        t._id === editing._id ? { ...t, recentWork: newWork } : t
      ));
    }
  };

  return (
    <div className="flex gap-6 h-full">

      {/* ── Lista ── */}
      <div className={`flex flex-col gap-4 transition-all ${editing ? "flex-1 min-w-0" : "w-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black" style={{ color: "var(--text)" }}>Instaladores</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {tecnicos.length} técnico{tecnicos.length !== 1 ? "s" : ""} registrado{tecnicos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
            <PlusCircle className="h-4 w-4" /> Agregar técnico
          </button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : tecnicos.length === 0 ? (
          <div className="bento p-12 text-center">
            <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-20" style={{ color: "var(--muted)" }} />
            <p className="font-semibold" style={{ color: "var(--text)" }}>Sin técnicos aún</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Creá el primero con el botón de arriba</p>
          </div>
        ) : (
          <div className="bento overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Técnico", "Zona", "Recomendado", "Activo", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.map((t, i) => (
                    <tr
                      key={t._id}
                      style={{
                        borderBottom: i < tecnicos.length - 1 ? "1px solid var(--border)" : "none",
                        background: editing && editing !== "new" && editing._id === t._id
                          ? "color-mix(in srgb, var(--brand-tint) 60%, transparent)"
                          : "transparent",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                            style={{ background: "var(--surface2)" }}>
                            {t.photo
                              ? <img src={t.photo} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                  <UserCheck className="h-4 w-4 opacity-30" style={{ color: "var(--muted)" }} />
                                </div>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: "var(--text)" }}>
                              {t.title ? `${t.title} ` : ""}{t.name}
                            </p>
                            <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                              {t.specialties?.join(", ") || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: "var(--surface2)", color: "var(--text2)" }}>
                          {t.zone}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle checked={t.recommended} onChange={() => handleToggle(t, "recommended")} />
                      </td>
                      <td className="px-4 py-3">
                        <Toggle checked={t.active} onChange={() => handleToggle(t, "active")} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(t)} title="Editar"
                            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--brand-tint)]"
                            style={{ color: "var(--brand)" }}>
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(t._id)} title="Eliminar"
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                            style={{ color: "#DC2626" }}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Panel de edición ── */}
      {editing !== null && (
        <div className="w-96 flex-shrink-0">
          <form onSubmit={handleSave} className="bento p-5 space-y-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-bold" style={{ color: "var(--text)" }}>
                {editing === "new" ? "Nuevo técnico" : "Editar técnico"}
              </h2>
              <button type="button" onClick={closeEdit} style={{ color: "var(--muted)" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Foto */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>
                Foto de perfil
              </label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: "var(--surface2)" }}>
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <UserCheck className="h-6 w-6 opacity-20" style={{ color: "var(--muted)" }} />
                      </div>
                  }
                </div>
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  <Upload className="h-3.5 w-3.5" /> Subir foto
                </button>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                />
              </div>
            </div>

            {/* Nombre / Título */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Título
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Ing."
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Nombre *
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Ricardo Méndez"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Zona / Ciudad / Barrio */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                Zona *
              </label>
              <select className={inputCls} style={inputStyle} value={form.zone} onChange={(e) => set("zone", e.target.value)} required>
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Ciudad
                </label>
                <input className={inputCls} style={inputStyle} placeholder="Buenos Aires"
                  value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Barrio
                </label>
                <input className={inputCls} style={inputStyle} placeholder="Palermo"
                  value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                WhatsApp (solo números)
              </label>
              <input className={inputCls} style={inputStyle} placeholder="5491112345678"
                value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} />
            </div>

            {/* Rating / Experiencia / Reseñas */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Rating
                </label>
                <input type="number" min="0" max="5" step="0.1" className={inputCls} style={inputStyle}
                  value={form.rating} onChange={(e) => set("rating", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Experiencia
                </label>
                <input type="number" min="0" className={inputCls} style={inputStyle}
                  value={form.yearsExperience} onChange={(e) => set("yearsExperience", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Reseñas
                </label>
                <input type="number" min="0" className={inputCls} style={inputStyle}
                  value={form.reviewCount} onChange={(e) => set("reviewCount", e.target.value)} />
              </div>
            </div>

            {/* Especialidades */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>
                Especialidades
              </label>
              <SpecialtyTags value={form.specialties} onChange={(v) => set("specialties", v)} />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                Resumen profesional
              </label>
              <textarea
                rows={4}
                className={inputCls + " resize-none"}
                style={inputStyle}
                placeholder="Descripción del profesional..."
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
            </div>

            {/* Servicios */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>
                Servicios ofrecidos
              </label>
              <ServicesList value={form.services} onChange={(v) => set("services", v)} />
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between py-2 border-t border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Recomendado A&P</span>
              <Toggle checked={form.recommended} onChange={(v) => set("recommended", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Activo (visible en el sitio)</span>
              <Toggle checked={form.active} onChange={(v) => set("active", v)} />
            </div>

            {/* Galería (solo en edición) */}
            {editing !== "new" && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: "var(--muted)" }}>
                  Galería de trabajos ({editing.recentWork?.length || 0}/12)
                </label>
                <WorkGallery
                  tecnicoId={editing._id}
                  recentWork={editing.recentWork}
                  onUpdate={handleGalleryUpdate}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-2.5 text-sm"
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Guardando..." : editing === "new" ? "Crear técnico" : "Guardar cambios"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
