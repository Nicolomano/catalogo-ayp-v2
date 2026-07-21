import { useEffect, useState, useRef } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { Star, ArrowUp, ArrowDown, X, Search, Package, Plus } from "lucide-react";

const inputCls =
  "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

function priceLabel(p) {
  return p.priceARS ? `$${p.priceARS.toLocaleString("es-AR")}` : "Sin precio";
}

export default function AdminDestacados() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Buscador para agregar
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const fetchFeatured = async () => {
    setLoading(true);
    try {
      const res = await API.get("/products/featured/list");
      setFeatured(Array.isArray(res.data) ? res.data : []);
      setDirty(false);
    } catch {
      toast.error("Error cargando destacados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeatured(); }, []);

  // Búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await API.get("/products/admin/all", {
          params: { search: search.trim(), limit: 20 },
        });
        const list = Array.isArray(res.data?.products) ? res.data.products : [];
        setResults(list.filter((p) => !p.featured));
      } catch {
        toast.error("Error buscando productos");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= featured.length) return;
    setFeatured((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const saveOrder = async () => {
    try {
      await API.patch("/products/featured/reorder", { ids: featured.map((p) => p._id) });
      toast.success("Orden guardado");
      setDirty(false);
    } catch {
      toast.error("No se pudo guardar el orden");
    }
  };

  const removeFeatured = async (id) => {
    try {
      await API.patch(`/products/${id}/featured`, {});
      setFeatured((prev) => prev.filter((p) => p._id !== id));
      toast.success("Quitado de destacados");
    } catch {
      toast.error("No se pudo quitar");
    }
  };

  const addFeatured = async (product) => {
    try {
      const res = await API.patch(`/products/${product._id}/featured`, {});
      const updated = res.data?.product ?? { ...product, featured: true };
      setFeatured((prev) => [...prev, updated]);
      setResults((prev) => prev.filter((p) => p._id !== product._id));
      toast.success("Agregado a destacados");
    } catch {
      toast.error("No se pudo agregar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bento p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Star size={18} style={{ color: "var(--brand)" }} /> Destacados de la home
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            El primero es la card grande; el resto va en el carrusel. Ordenálos con las flechas.
          </p>
        </div>
        {featured.length > 1 && (
          <button
            onClick={saveOrder}
            disabled={!dirty}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            Guardar orden
          </button>
        )}
      </div>

      {/* Lista de destacados actuales */}
      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>Cargando…</p>
      ) : featured.length === 0 ? (
        <div className="bento p-12 text-center">
          <Star size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--muted)" }}>Todavía no hay productos destacados. Agregá alguno abajo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {featured.map((p, i) => (
            <div key={p._id} className="bento p-3 flex items-center gap-3">
              {/* Posición */}
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{
                  background: i === 0 ? "var(--brand)" : "var(--brand-tint)",
                  color: i === 0 ? "#fff" : "var(--brand)",
                }}
                title={i === 0 ? "Card grande" : `Posición ${i + 1}`}
              >
                {i + 1}
              </div>

              {/* Imagen */}
              <div
                className="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
                style={{ background: "var(--surface2)" }}
              >
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                ) : (
                  <Package size={18} style={{ color: "var(--muted)" }} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{p.name}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {p.brand ? `${p.brand} · ` : ""}{priceLabel(p)}
                  {p.inStock === false && <span style={{ color: "var(--error)" }}> · Sin stock</span>}
                  {i === 0 && <span style={{ color: "var(--brand)" }}> · Card grande</span>}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                  title="Subir"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === featured.length - 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                  title="Bajar"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  onClick={() => removeFeatured(p._id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626" }}
                  title="Quitar de destacados"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agregar destacado */}
      <div className="bento p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Agregar destacado</h3>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Buscá un producto por nombre o código y agregalo a los destacados.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto…"
            className={inputCls + " pl-9"}
            style={inputStyle}
          />
        </div>

        {searching ? (
          <p className="text-sm text-center py-3" style={{ color: "var(--muted)" }}>Buscando…</p>
        ) : search.trim().length >= 2 && results.length === 0 ? (
          <p className="text-sm text-center py-3" style={{ color: "var(--muted)" }}>
            No hay productos sin destacar para "{search.trim()}".
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((p) => (
              <div key={p._id} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: "var(--surface2)" }}>
                <div
                  className="shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--surface)" }}
                >
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package size={16} style={{ color: "var(--muted)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{p.name}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {p.brand ? `${p.brand} · ` : ""}{priceLabel(p)}
                  </p>
                </div>
                <button
                  onClick={() => addFeatured(p)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors"
                  style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                >
                  <Plus size={13} /> Destacar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
