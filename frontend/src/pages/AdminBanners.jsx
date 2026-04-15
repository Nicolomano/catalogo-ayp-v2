import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { Image, PlusCircle } from "lucide-react";

const AUTH = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const inputCls =
  "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

export default function AdminBanners() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [typeFilter, setTypeFilter] = useState("home");

  const fetchAll = () => {
    API.get("/banners/admin/all", { headers: AUTH(), params: { type: typeFilter } })
      .then((res) => setItems(res.data || []))
      .catch((e) => console.error(e));
  };

  useEffect(() => { fetchAll(); }, [typeFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("title", editing.title || "");
      fd.append("subtitle", editing.subtitle || "");
      fd.append("linkUrl", editing.linkUrl || "");
      fd.append("type", editing.type || "home");
      fd.append("order", String(editing.order ?? 0));
      fd.append("active", String(!!editing.active));
      if (editing.imageFile) fd.append("image", editing.imageFile);

      let res;
      if (editing._id) {
        res = await API.put(`/banners/${editing._id}`, fd, {
          headers: { ...AUTH(), "Content-Type": "multipart/form-data" },
        });
        setItems((prev) => prev.map((i) => (i._id === editing._id ? res.data : i)));
        toast.success("Banner actualizado");
      } else {
        res = await API.post("/banners", fd, {
          headers: { ...AUTH(), "Content-Type": "multipart/form-data" },
        });
        setItems((prev) => [res.data, ...prev]);
        toast.success("Banner creado");
      }
      setEditing(null);
    } catch {
      toast.error("No se pudo guardar");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este banner?")) return;
    await API.delete(`/banners/${id}`, { headers: AUTH() });
    setItems((prev) => prev.filter((i) => i._id !== id));
    toast.success("Banner eliminado");
  };

  const handleToggle = async (id) => {
    const res = await API.patch(`/banners/${id}/toggle`, {}, { headers: AUTH() });
    setItems((prev) => prev.map((i) => (i._id === id ? res.data.banner : i)));
  };

  const handleReorder = async () => {
    await API.patch("/banners/reorder", { ids: items.map((i) => i._id) }, { headers: AUTH() });
    toast.success("Orden actualizado");
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bento p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Banners / Slider
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {items.length} banner{items.length !== 1 ? "s" : ""} en esta sección
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded-xl px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="home">Home (hero)</option>
            <option value="catalog">Catálogo</option>
          </select>
          <button
            onClick={() =>
              setEditing({ title: "", subtitle: "", linkUrl: "", type: typeFilter, order: items.length, active: true })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            <PlusCircle size={15} /> Nuevo banner
          </button>
          {items.length > 1 && (
            <button
              onClick={handleReorder}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
            >
              Guardar orden
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      {items.length === 0 ? (
        <div className="bento p-12 text-center">
          <Image size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--muted)" }}>No hay banners en esta sección.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => (
            <div key={b._id} className="bento overflow-hidden flex flex-col">
              {/* Preview imagen */}
              <div
                className="relative flex items-center justify-center"
                style={{ height: 130, background: "var(--surface2)" }}
              >
                {b.image ? (
                  <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <Image size={32} style={{ color: "var(--muted)" }} />
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: b.active ? "rgba(22,163,74,0.85)" : "rgba(220,38,38,0.75)",
                      color: "#fff",
                    }}
                  >
                    {b.active ? "Activo" : "Inactivo"}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                  >
                    #{b.order + 1}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    {b.title || <span style={{ color: "var(--muted)" }}>Sin título</span>}
                  </p>
                  {b.subtitle && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--muted)" }}>
                      {b.subtitle}
                    </p>
                  )}
                  <span
                    className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                  >
                    {b.type === "home" ? "Home" : "Catálogo"}
                  </span>
                </div>

                {/* Acciones */}
                <div
                  className="flex gap-1.5 pt-2"
                  style={{ borderTop: "1px solid var(--border)", marginTop: "auto" }}
                >
                  <button
                    onClick={() => setEditing(b)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium"
                    style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(b._id)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium"
                    style={{
                      background: b.active ? "rgba(234,179,8,0.12)" : "rgba(22,163,74,0.12)",
                      color: b.active ? "#B45309" : "#16A34A",
                    }}
                  >
                    {b.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => handleDelete(b._id)}
                    className="text-xs py-1.5 px-2 rounded-lg font-medium"
                    style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626" }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar / crear */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {editing._id ? "Editar banner" : "Nuevo banner"}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {[
                { label: "Título", key: "title", type: "text" },
                { label: "Subtítulo", key: "subtitle", type: "text" },
              ].map(({ label, key, type }) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    {label}
                  </span>
                  <input
                    type={type}
                    value={editing[key] || ""}
                    onChange={(e) => setEditing((p) => ({ ...p, [key]: e.target.value }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                  Link (opcional)
                </span>
                <input
                  type="url"
                  value={editing.linkUrl || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, linkUrl: e.target.value }))}
                  placeholder="https://..."
                  className={inputCls}
                  style={inputStyle}
                />
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="block col-span-1">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    Tipo
                  </span>
                  <select
                    value={editing.type || "home"}
                    onChange={(e) => setEditing((p) => ({ ...p, type: e.target.value }))}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="home">Home</option>
                    <option value="catalog">Catálogo</option>
                  </select>
                </label>
                <label className="block col-span-1">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    Orden
                  </span>
                  <input
                    type="number"
                    value={editing.order ?? 0}
                    onChange={(e) => setEditing((p) => ({ ...p, order: Number(e.target.value) }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                </label>
                <label className="block col-span-1">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    Estado
                  </span>
                  <select
                    value={editing.active ? "1" : "0"}
                    onChange={(e) => setEditing((p) => ({ ...p, active: e.target.value === "1" }))}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                  Imagen{" "}
                  <span className="opacity-60">
                    {editing.type === "catalog"
                      ? "(horizontal · mín. 1200×400 px — proporción 3:1)"
                      : "(cuadrada · mín. 900×900 px)"}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  {editing.image && !editing.imageFile && (
                    <img
                      src={editing.image}
                      alt="preview"
                      className="w-28 h-16 object-cover rounded-xl"
                      style={{ border: "1px solid var(--border)" }}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, imageFile: e.target.files?.[0] }))
                    }
                    className="text-sm"
                    style={{ color: "var(--text)" }}
                  />
                </div>
              </label>

              <div
                className="flex justify-end gap-2 pt-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
