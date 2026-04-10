import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { PlusCircle, Trash2, FolderTree, ChevronRight } from "lucide-react";

const inputCls =
  "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", slug: "", parent: "" });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await API.get("/categories/tree");
      setCategories(res.data);
    } catch {
      toast.error("No se pudieron cargar las categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCat.name || !newCat.slug) return toast.error("Completá nombre y slug");
    try {
      await API.post("/categories", newCat);
      toast.success("Categoría creada");
      setNewCat({ name: "", slug: "", parent: "" });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear categoría");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await API.delete(`/categories/${id}`);
      toast.success("Categoría eliminada");
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo eliminar");
    }
  };

  const renderTree = (nodes, level = 0) =>
    nodes.map((cat) => (
      <div key={cat._id} style={{ marginLeft: level * 16 }}>
        <div
          className="flex items-center justify-between py-2 px-3 rounded-xl transition-colors"
          style={{ background: level === 0 ? "var(--brand-tint)" : "transparent" }}
        >
          <div className="flex items-center gap-2">
            {level > 0 && (
              <ChevronRight size={12} style={{ color: "var(--muted)" }} />
            )}
            <span
              className="font-medium text-sm"
              style={{ color: "var(--text)" }}
            >
              {cat.name}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-mono"
              style={{ background: "var(--surface2)", color: "var(--muted)" }}
            >
              /{cat.slug}
            </span>
          </div>
          <button
            onClick={() => handleDelete(cat._id)}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "#DC2626" }}
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {cat.children?.length > 0 && (
          <div
            className="ml-4 mt-1 mb-1 pl-3"
            style={{ borderLeft: "2px solid var(--border)" }}
          >
            {renderTree(cat.children, level + 1)}
          </div>
        )}
      </div>
    ));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Categorías y Subcategorías
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          Creá y organizá categorías de forma jerárquica. Las subcategorías se crean eligiendo una categoría padre.
        </p>
      </div>

      {/* Formulario nueva categoría */}
      <form onSubmit={handleCreate} className="bento p-5 space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Nueva categoría
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nombre"
            className={inputCls}
            style={inputStyle}
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Slug (ej: compresores)"
            className={inputCls}
            style={inputStyle}
            value={newCat.slug}
            onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
          />
          <select
            className={inputCls}
            style={inputStyle}
            value={newCat.parent}
            onChange={(e) => setNewCat({ ...newCat, parent: e.target.value })}
          >
            <option value="">Sin categoría padre</option>
            {categories.flatMap((c) => [
              <option key={c._id} value={c._id}>{c.name}</option>,
              ...(c.children || []).map((sc) => (
                <option key={sc._id} value={sc._id}>└ {sc.name}</option>
              )),
            ])}
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            <PlusCircle size={15} /> Crear categoría
          </button>
        </div>
      </form>

      {/* Árbol de categorías */}
      <div className="bento p-5">
        <h2
          className="text-sm font-semibold mb-4 flex items-center gap-2"
          style={{ color: "var(--text)" }}
        >
          <FolderTree size={16} style={{ color: "var(--brand)" }} />
          Estructura actual
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Cargando categorías…
          </p>
        ) : categories.length ? (
          <div className="space-y-1">{renderTree(categories)}</div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No hay categorías creadas todavía.
          </p>
        )}
      </div>
    </div>
  );
}
