import { useEffect, useMemo, useRef, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { Package, PlusCircle, Download, Search, Upload, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useConfirm } from "../Context/ConfirmContext.jsx";

const PAGE_SIZE = 50;


const inputCls =
  "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

function AdminProducts() {
  const confirm = useConfirm();
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [sort, setSort] = useState("createdAt:desc");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  /* -------------------- Cargar categorías -------------------- */
  useEffect(() => {
    // Combina categorías de la colección + categorías ya asignadas a productos
    Promise.all([
      API.get("/products/meta/categories").then((r) => Array.isArray(r.data) ? r.data : []),
      API.get("/categories").then((r) => Array.isArray(r.data) ? r.data : []).catch(() => []),
    ]).then(([metaCats, collCats]) => {
      // Normaliza meta-categories (vienen como {category, subcategories})
      const fromMeta = metaCats.map((item) =>
        typeof item === "string"
          ? { category: item, subcategories: [] }
          : { category: item.category || item._id || "", subcategories: Array.isArray(item.subcategories) ? item.subcategories.flat().filter(Boolean) : [] }
      );
      // Normaliza categorías de la colección (vienen como {name, slug, ...})
      const fromColl = collCats
        .filter((c) => !c.parent)
        .map((c) => ({
          category: c.name || c.slug || "",
          subcategories: collCats.filter((s) => s.parent === c._id || s.parent?.toString() === c._id?.toString()).map((s) => s.name || s.slug || ""),
        }));
      // Merge: preferir fromColl si existe la misma categoría
      const merged = [...fromColl];
      fromMeta.forEach((m) => {
        if (!merged.some((c) => c.category === m.category)) merged.push(m);
      });
      const cats = merged.filter((c) => c.category);
      setCategories(cats);
      if (category !== "all") {
        const found = cats.find((c) => c.category === category);
        setSubcategories(found ? found.subcategories : []);
      }
    }).catch((e) => console.error("Error cargando categorías:", e));
  }, []);

  useEffect(() => {
    const found = categories.find((c) => c.category === category);
    setSubcategories(found ? found.subcategories : []);
    setSubcategory("all");
  }, [category, categories]);

  const debouncedSearch = useMemo(() => {
    let t;
    return (value, cb) => {
      clearTimeout(t);
      t = setTimeout(() => cb(value), 400);
    };
  }, []);

  /* -------------------- Fetch productos -------------------- */
  const fetchProducts = async ({
    searchParam = search,
    categoryParam = category,
    subcategoryParam = subcategory,
    sortParam = sort,
    pageParam = page,
  } = {}) => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, page: pageParam };
      if (searchParam?.trim()) params.search = searchParam.trim();
      if (categoryParam !== "all") params.category = categoryParam;
      if (subcategoryParam !== "all") params.subcategory = subcategoryParam;
      if (sortParam) params.sort = sortParam;

      const res = await API.get("/products/admin/all", { params });

      if (Array.isArray(res.data.products)) setProducts(res.data.products);
      else if (Array.isArray(res.data)) setProducts(res.data);
      else setProducts([]);
      setTotalPages(res.data.pages ?? 1);
      setTotalCount(res.data.total ?? 0);
    } catch (err) {
      console.error("Error obteniendo productos (admin):", err);
      toast.error("No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => {
    setPage(1);
    fetchProducts({ pageParam: 1 });
  }, [category, subcategory, sort]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value, (v) => { setPage(1); fetchProducts({ searchParam: v, pageParam: 1 }); });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchProducts({ pageParam: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* -------------------- Acciones -------------------- */
  const handleDelete = async (id) => {
    if (!(await confirm({
      title: "Eliminar producto",
      message: "¿Seguro que querés eliminar este producto? Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      tone: "danger",
    }))) return;
    try {
      await API.delete(`/products/${id}`, );
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success("Producto eliminado");
    } catch {
      toast.error("Error al eliminar producto");
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await API.patch(`/products/${id}/toggle`, {}, );
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? res.data.product : p))
      );
      toast.success(res.data.message);
    } catch {
      toast.error("No se pudo cambiar el estado del producto");
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      const res = await API.patch(`/products/${id}/featured`, {}, );
      setProducts((prev) => prev.map((p) => (p._id === id ? res.data.product : p)));
      toast.success(res.data.message);
    } catch {
      toast.error("No se pudo cambiar destacado");
    }
  };

  const handleToggleStock = async (id) => {
    try {
      const res = await API.patch(`/products/${id}/stock`, {}, );
      setProducts((prev) => prev.map((p) => (p._id === id ? res.data.product : p)));
      toast.success(res.data.message);
    } catch {
      toast.error("No se pudo cambiar el stock");
    }
  };

  const importInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleMigrateCategories = async () => {
    if (!(await confirm({
      title: "Migrar categorías",
      message: "¿Migrar el campo 'category' (texto) a 'categories' (lista) en todos los productos que lo necesiten?",
      confirmText: "Migrar",
    }))) return;
    setMigrating(true);
    try {
      const res = await API.post("/products/admin/migrate-categories", {}, );
      toast.success(res.data.message);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error en migración");
    } finally {
      setMigrating(false);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await API.post("/products/import/excel", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.skipped > 0 && res.data.errors?.length > 0) {
        const errSample = res.data.errors.slice(0, 3).join(" | ");
        toast.error(`${res.data.message}\nErrores: ${errSample}`, { duration: 8000 });
        console.warn("Import errors:", res.data.errors);
        console.info("Detected columns:", res.data.detectedColumns);
      } else if (res.data.skipped > 0) {
        toast.error(`${res.data.message}\nColumnas: ${res.data.detectedColumns?.join(", ")}`, { duration: 8000 });
        console.info("Detected columns:", res.data.detectedColumns);
      } else {
        toast.success(res.data.message);
      }
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="space-y-6">
      {/* Encabezado + filtros */}
      <div className="bento p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
              Gestión de productos
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              {totalCount} producto{totalCount !== 1 ? "s" : ""} en total
              {totalPages > 1 && ` · página ${page} de ${totalPages}`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() =>
                setEditingProduct({
                  name: "", description: "", priceUSD: 0, priceARS: "",
                  fixedInARS: false, categories: [], subcategories: [], productCode: "",
                })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "var(--brand)", color: "#fff" }}
            >
              <PlusCircle size={15} /> Nuevo producto
            </button>
            <button
              onClick={() => window.open(`${API.defaults.baseURL}/products/export/excel`, "_blank")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}
            >
              <Download size={15} /> Exportar Excel
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "rgba(234,179,8,0.12)", color: "#B45309" }}
            >
              <Upload size={15} /> {importing ? "Importando…" : "Importar Excel"}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportExcel}
            />
            <button
              onClick={handleMigrateCategories}
              disabled={migrating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "rgba(99,102,241,0.12)", color: "#4F46E5" }}
              title="Normaliza productos con campo 'category' (string) al nuevo formato 'categories' (array)"
            >
              {migrating ? "Migrando…" : "Migrar categorías"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted)" }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={handleSearchChange}
              className={inputCls}
              style={{ ...inputStyle, paddingLeft: "2rem" }}
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>{c.category}</option>
            ))}
          </select>

          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className={inputCls}
            style={inputStyle}
            disabled={subcategories.length === 0}
          >
            <option value="all">Todas las subcategorías</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            <option value="createdAt:desc">Más nuevos</option>
            <option value="name:asc">Nombre (A-Z)</option>
            <option value="name:desc">Nombre (Z-A)</option>
            <option value="priceARS:asc">Precio (menor a mayor)</option>
            <option value="priceARS:desc">Precio (mayor a menor)</option>
            <option value="active:desc">Activos primero</option>
          </select>
        </div>
      </div>

      {/* Grid de cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm" style={{ color: "var(--muted)" }}>Cargando…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bento p-12 text-center">
          <Package size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--muted)" }}>No hay resultados para los filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p._id} className="bento flex flex-col overflow-hidden">
              {/* Imagen */}
              <div
                className="relative flex items-center justify-center"
                style={{ height: 160, background: "var(--surface2)" }}
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package size={36} style={{ color: "var(--muted)" }} />
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: p.active ? "rgba(22,163,74,0.85)" : "rgba(220,38,38,0.75)",
                      color: "#fff",
                    }}
                  >
                    {p.active ? "Activo" : "Inactivo"}
                  </span>
                  {p.inStock === false && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>
                      Sin stock
                    </span>
                  )}
                  {p.featured && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                      style={{ background: "rgba(234,179,8,0.9)", color: "#fff" }}>
                      <Star size={10} fill="currentColor" /> Destacado
                    </span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div>
                  <p
                    className="text-xs font-mono"
                    style={{ color: "var(--muted)" }}
                  >
                    {p.productCode}
                  </p>
                  <p
                    className="font-semibold text-sm leading-snug line-clamp-2"
                    style={{ color: "var(--text)" }}
                  >
                    {p.name}
                  </p>
                  {p.fixedInARS && (
                    <span
                      className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                    >
                      Fijo en ARS
                    </span>
                  )}
                </div>

                {/* Categorías */}
                {p.categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Precios */}
                <div
                  className="flex flex-wrap items-center gap-2 text-sm mt-auto pt-2"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  {p.priceARS ? (
                    <span className="font-bold" style={{ color: "var(--text)" }}>
                      {Number(p.priceARS).toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  ) : null}
                  {p.priceUSD ? (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      U$S {Number(p.priceUSD).toLocaleString("es-AR")}
                    </span>
                  ) : null}
                  {!p.priceARS && !p.priceUSD && (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>Sin precio</span>
                  )}
                </div>

                {/* Acciones — fila 1 */}
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => setEditingProduct(p)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
                    style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(p._id)}
                    className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors"
                    style={{
                      background: p.active ? "rgba(234,179,8,0.12)" : "rgba(22,163,74,0.12)",
                      color: p.active ? "#B45309" : "#16A34A",
                    }}
                  >
                    {p.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="text-xs py-1.5 px-2 rounded-lg font-medium transition-colors"
                    style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626" }}
                  >
                    Eliminar
                  </button>
                </div>
                {/* Acciones — fila 2 */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleToggleFeatured(p._id)}
                    className="flex-1 text-xs py-1 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
                    style={{
                      background: p.featured ? "rgba(234,179,8,0.15)" : "var(--surface2)",
                      color: p.featured ? "#B45309" : "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Star size={10} fill={p.featured ? "currentColor" : "none"} />
                    {p.featured ? "Destacado" : "Destacar"}
                  </button>
                  <button
                    onClick={() => handleToggleStock(p._id)}
                    className="flex-1 text-xs py-1 rounded-lg font-medium transition-colors"
                    style={{
                      background: p.inStock === false ? "rgba(220,38,38,0.10)" : "var(--surface2)",
                      color: p.inStock === false ? "#DC2626" : "var(--muted)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {p.inStock === false ? "Sin stock" : "Con stock"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2 pb-4">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            <ChevronLeft size={15} /> Anterior
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm" style={{ color: "var(--muted)" }}>…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => handlePageChange(item)}
                    className="w-9 h-9 rounded-xl text-sm font-medium transition-colors"
                    style={
                      item === page
                        ? { background: "var(--brand)", color: "#fff" }
                        : { background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }
                    }
                  >
                    {item}
                  </button>
                )
              )}
          </div>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            Siguiente <ChevronRight size={15} />
          </button>
        </div>

        <form
          className="flex items-center justify-center gap-2 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            const val = parseInt(e.target.pageInput.value, 10);
            if (val >= 1 && val <= totalPages) handlePageChange(val);
            e.target.reset();
          }}
        >
          <span className="text-xs" style={{ color: "var(--muted)" }}>Ir a la página</span>
          <input
            name="pageInput"
            type="number"
            min={1}
            max={totalPages}
            placeholder={page}
            className="input-field text-center text-sm"
            style={{ width: "64px", padding: "5px 4px" }}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            Ir
          </button>
        </form>
      )}

      {/* Modal crear / editar */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {editingProduct._id ? "Editar producto" : "Nuevo producto"}
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const formData = new FormData();
                  const norm = (s) => (s || "").trim().replace(/\s+/g, " ");
                  formData.append("name", norm(editingProduct.name));
                  formData.append("description", norm(editingProduct.description));
                  formData.append("productCode", norm(editingProduct.productCode));
                  if (editingProduct.brand) formData.append("brand", editingProduct.brand.trim());

                  if (editingProduct.fixedInARS) {
                    if (editingProduct.priceARS) formData.append("priceARS", editingProduct.priceARS);
                    if (editingProduct.priceUSD) formData.append("priceUSD", editingProduct.priceUSD);
                  } else {
                    if (editingProduct.priceUSD) formData.append("priceUSD", editingProduct.priceUSD);
                  }
                  formData.append("fixedInARS", editingProduct.fixedInARS ? "true" : "false");

                  if (editingProduct.categories?.length)
                    editingProduct.categories.forEach((cat) => formData.append("categories[]", cat));
                  if (editingProduct.subcategories?.length)
                    editingProduct.subcategories.forEach((sub) => formData.append("subcategories[]", sub));
                  if (editingProduct.imageFile)
                    formData.append("image", editingProduct.imageFile);

                  let res;
                  if (editingProduct._id) {
                    res = await API.put(`/products/${editingProduct._id}`, formData, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                    setProducts((prev) =>
                      prev.map((p) => (p._id === editingProduct._id ? res.data : p))
                    );
                    toast.success("Producto actualizado");
                  } else {
                    res = await API.post("/products", formData, {
                      headers: { "Content-Type": "multipart/form-data" },
                    });
                    setProducts((prev) => [res.data, ...prev]);
                    toast.success("Producto creado");
                  }
                  setEditingProduct(null);
                } catch {
                  toast.error("No se pudo guardar el producto");
                }
              }}
              className="space-y-4"
            >
              {[
                { label: "Nombre", key: "name", type: "text", required: true },
                { label: "Código", key: "productCode", type: "text", required: true },
                { label: "Marca (opcional)", key: "brand", type: "text", required: false },
              ].map(({ label, key, type, required }) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    {label}
                  </span>
                  <input
                    type={type}
                    value={editingProduct[key] || ""}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, [key]: e.target.value }))}
                    className={inputCls}
                    style={inputStyle}
                    required={required}
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                  Descripción
                </span>
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, description: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  rows={3}
                  required
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingProduct.fixedInARS}
                  onChange={(e) => setEditingProduct((p) => ({ ...p, fixedInARS: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Precio fijo en ARS
                </span>
              </label>

              {editingProduct.fixedInARS ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                      Precio (ARS)
                    </span>
                    <input
                      type="number" step="0.01" min="0"
                      value={editingProduct.priceARS || ""}
                      onChange={(e) => setEditingProduct((p) => ({ ...p, priceARS: e.target.value }))}
                      className={inputCls} style={inputStyle} required
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                      Precio USD (opcional)
                    </span>
                    <input
                      type="number" step="0.01" min="0"
                      value={editingProduct.priceUSD || ""}
                      onChange={(e) => setEditingProduct((p) => ({ ...p, priceUSD: e.target.value }))}
                      className={inputCls} style={inputStyle}
                    />
                  </label>
                </div>
              ) : (
                <label className="block">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    Precio (USD)
                  </span>
                  <input
                    type="number" step="0.01" min="0"
                    value={editingProduct.priceUSD || ""}
                    onChange={(e) => setEditingProduct((p) => ({ ...p, priceUSD: e.target.value }))}
                    className={inputCls} style={inputStyle} required
                  />
                </label>
              )}

              {/* Categorías */}
              <div>
                <span className="text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                  Categorías
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const selected = editingProduct.categories?.includes(c.category);
                    return (
                      <button
                        key={c.category}
                        type="button"
                        onClick={() =>
                          setEditingProduct((prev) => {
                            const already = prev.categories?.includes(c.category);
                            return {
                              ...prev,
                              categories: already
                                ? prev.categories.filter((x) => x !== c.category)
                                : [...(prev.categories || []), c.category],
                              subcategories: [],
                            };
                          })
                        }
                        className="px-3 py-1 rounded-full border text-xs transition-colors"
                        style={{
                          background: selected ? "var(--brand)" : "var(--surface2)",
                          borderColor: selected ? "var(--brand)" : "var(--border)",
                          color: selected ? "#fff" : "var(--text)",
                        }}
                      >
                        {c.category}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategorías */}
              {editingProduct.categories?.length > 0 && (
                <div>
                  <span className="text-xs font-medium mb-2 block" style={{ color: "var(--muted)" }}>
                    Subcategorías
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {editingProduct.categories.map((cat) => {
                      const found = categories.find((c) => c.category === cat);
                      return found?.subcategories?.map((s) => {
                        const selected = editingProduct.subcategories?.includes(s);
                        return (
                          <button
                            key={`${cat}-${s}`}
                            type="button"
                            onClick={() =>
                              setEditingProduct((prev) => {
                                const already = prev.subcategories?.includes(s);
                                return {
                                  ...prev,
                                  subcategories: already
                                    ? prev.subcategories.filter((x) => x !== s)
                                    : [...(prev.subcategories || []), s],
                                };
                              })
                            }
                            className="px-3 py-1 rounded-full border text-xs transition-colors"
                            style={{
                              background: selected ? "#16A34A" : "var(--surface2)",
                              borderColor: selected ? "#16A34A" : "var(--border)",
                              color: selected ? "#fff" : "var(--text)",
                            }}
                          >
                            {s}{" "}
                            <span className="opacity-60">({cat})</span>
                          </button>
                        );
                      });
                    })}
                  </div>
                </div>
              )}

              {/* Imagen */}
              <div>
                <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                  Imagen
                </span>
                {editingProduct.image && !editingProduct.imageFile && (
                  <img
                    src={editingProduct.image}
                    alt="preview"
                    className="w-24 h-16 object-cover rounded-xl mb-2"
                    style={{ border: "1px solid var(--border)" }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditingProduct((p) => ({ ...p, imageFile: e.target.files?.[0] }))
                  }
                  className="text-sm"
                  style={{ color: "var(--text)" }}
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-sm transition-colors"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
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

export default AdminProducts;
