import { useEffect, useState, useMemo, useTransition, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SlidersHorizontal, X } from "lucide-react";
import API from "../api/axios";
import { useCart } from "../Context/CartContext.jsx";
import { useAuth } from "../Context/AuthContext.jsx";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar.jsx";

const PAGE_SIZE = 24;

function Catalogo() {
  const [allProducts, setAllProducts] = useState([]);
  const [isFetching, setIsFetching]   = useState(true);  // true inicial → evita que el observer dispare antes de la 1ª carga
  const [hasMore, setHasMore]         = useState(true);
  const [page, setPage]               = useState(1);
  const [isPending, startTransition]  = useTransition();

  // Ref para que el observer siempre lea el valor actual sin recrearse
  const isFetchingRef = useRef(true);

  const { addToCart }                           = useCart();
  const { isServiceApproved, servicePrice }     = useAuth();
  const [quantities, setQuantities]             = useState({});

  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories]       = useState([]);
  const [category, setCategory]           = useState("all");
  const [subcategory, setSubcategory]     = useState("all");
  const [sort, setSort]                   = useState("soldCount:desc");
  const [brands, setBrands]               = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [drawerOpen, setDrawerOpen]       = useState(false);

  const loaderRef = useRef(null);
  const location  = useLocation();
  const navigate  = useNavigate();
  const params    = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    API.get("/products/meta/categories").then((res) => {
      const data = res.data || [];
      const normalized = data.length && typeof data[0] === "string"
        ? data.map((c) => ({ category: c, subcategories: [] })) : data;
      setCategories(normalized);
    }).catch(() => {});
    API.get("/products/brands").then((res) => setBrands(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    const cat = params.get("cat");
    const sub = params.get("sub");
    if (cat) {
      const sel = categories.find((c) => c.category === cat);
      if (sel) {
        setCategory(cat);
        setSubcategory(sub && sel.subcategories?.includes(sub) ? sub : "all");
        return;
      }
    }
    setCategory("all"); setSubcategory("all");
  }, [categories, params]);

  useEffect(() => {
    isFetchingRef.current = true;  // bloquear observer durante el reset
    setIsFetching(true);
    setPage(1); setAllProducts([]); setHasMore(true);
  }, [category, subcategory, sort, debouncedSearch, selectedBrands]);

  useEffect(() => {
    const controller = new AbortController();
    isFetchingRef.current = true;
    setIsFetching(true);
    const qs = new URLSearchParams();
    qs.set("limit", PAGE_SIZE); qs.set("page", page); qs.set("sort", sort);
    if (category !== "all") qs.set("category", category);
    if (subcategory !== "all") qs.set("subcategory", subcategory);
    if (debouncedSearch.length >= 2) qs.set("search", debouncedSearch);
    selectedBrands.forEach((b) => qs.append("brand", b));

    API.get(`/products?${qs.toString()}`, { signal: controller.signal })
      .then((res) => {
        const incoming = res.data?.products || [];
        setHasMore(res.data?.hasMore ?? false);
        startTransition(() =>
          setAllProducts((prev) => page === 1 ? incoming : [...prev, ...incoming])
        );
      })
      .catch((err) => {
        if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
          console.error("Error cargando productos:", err);
          setHasMore(false); // cortar el loop del observer cuando el servidor no responde
        }
      })
      .finally(() => { isFetchingRef.current = false; setIsFetching(false); });

    return () => controller.abort();
  }, [category, subcategory, sort, debouncedSearch, selectedBrands, page]);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetchingRef.current) setPage((p) => p + 1);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]); // ya no depende de isFetching (usa el ref)

  const handleIncrease = (code) => setQuantities((prev) => ({ ...prev, [code]: (prev[code] || 1) + 1 }));
  const handleDecrease = (code) => setQuantities((prev) => ({ ...prev, [code]: Math.max(1, (prev[code] || 1) - 1) }));
  const calcCuota6 = (price) => price ? Math.round((price * 1.3) / 6) : null;

  const handleCategoryChange = (cat) => {
    setCategory(cat); setSubcategory("all");
    const u = new URL(window.location.href);
    if (cat === "all") { u.searchParams.delete("cat"); u.searchParams.delete("sub"); }
    else { u.searchParams.set("cat", cat); u.searchParams.delete("sub"); }
    navigate(`${u.pathname}${u.search}`, { replace: true });
  };
  const handleSubcategoryChange = (sub) => {
    setSubcategory(sub);
    const u = new URL(window.location.href);
    if (sub === "all") u.searchParams.delete("sub"); else u.searchParams.set("sub", sub);
    navigate(`${u.pathname}${u.search}`, { replace: true });
  };
  const handleBrandToggle = (brand) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  const handleClearAll = () => {
    setCategory("all"); setSubcategory("all"); setSelectedBrands([]); setSearch("");
    navigate("/catalogo", { replace: true });
  };

  const activeFilterCount = (category !== "all" ? 1 : 0) + (subcategory !== "all" ? 1 : 0) + selectedBrands.length;

  return (
    <>
      <Helmet>
        <title>{category !== "all" ? `${category} | A&P Refrigeración` : "Catálogo | A&P Refrigeración"}</title>
        <meta name="description" content={category !== "all" ? `Productos de ${category} en A&P Refrigeración.` : "Catálogo completo de A&P Refrigeración."} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="bento sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto" style={{ borderRadius: "16px" }}>
            <Sidebar
              categories={categories} selectedCategory={category} selectedSubcategory={subcategory}
              onCategoryChange={handleCategoryChange} onSubcategoryChange={handleSubcategoryChange}
              brands={brands} selectedBrands={selectedBrands} onBrandToggle={handleBrandToggle}
              onClearAll={handleClearAll} activeFilterCount={activeFilterCount}
            />
          </div>
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">

          {/* Barra de búsqueda + controles */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition-colors"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="text-white text-xs px-1.5 rounded-full" style={{ background: "var(--brand)" }}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none border transition-colors"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
              {(isFetching || isPending) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-t-transparent rounded-full"
                  style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
              )}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hidden sm:block rounded-xl px-3 py-2.5 text-sm outline-none border"
              style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              <option value="soldCount:desc">Más vendidos</option>
              <option value="name:asc">A-Z</option>
              <option value="createdAt:desc">Más nuevos</option>
              <option value="priceARS:asc">Menor precio</option>
              <option value="priceARS:desc">Mayor precio</option>
            </select>
          </div>

          {/* Badge service */}
          {isServiceApproved && (
            <div className="mb-4 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
              style={{ background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" }}>
              ✅ Estás viendo precios con <strong>10% de descuento service</strong>
            </div>
          )}

          {/* Grid de productos */}
          {allProducts.length === 0 && !isFetching ? (
            <p className="text-center py-16 text-lg" style={{ color: "var(--muted)" }}>
              No se encontraron productos.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {allProducts.map((p) => {
                const qty = quantities[p.productCode] || 1;
                const displayPrice = isServiceApproved ? servicePrice(p.priceARS) : p.priceARS;
                return (
                  <div key={p._id} className="bento flex flex-col" style={{ borderRadius: "16px" }}>
                    <Link to={`/product/${p.productCode}`} className="flex flex-col items-center p-3">
                      <div className="w-full aspect-square flex items-center justify-center mb-2 rounded-xl overflow-hidden"
                        style={{ background: "var(--surface2)" }}>
                        {p.image
                          ? <img src={p.image} alt={p.name} className="object-contain max-h-full" loading="lazy" decoding="async" />
                          : <div className="text-4xl opacity-20">📦</div>
                        }
                      </div>
                      {p.brand && <span className="text-xs mb-1" style={{ color: "var(--muted)" }}>{p.brand}</span>}
                      <h2 className="text-sm font-semibold text-center line-clamp-2 min-h-[2.5rem]" style={{ color: "var(--text)" }}>
                        {p.name}
                      </h2>
                    </Link>

                    <div className="px-3 pb-3 flex flex-col gap-2 mt-auto">
                      {p.inStock === false && (
                        <span className="text-xs text-center rounded-full px-2 py-0.5"
                          style={{ background: "#FEF2F2", color: "#DC2626" }}>
                          Sin stock
                        </span>
                      )}

                      {displayPrice ? (
                        <div className="text-center">
                          <p className="text-base font-bold" style={{ color: "var(--brand)" }}>
                            ${displayPrice.toLocaleString("es-AR")}
                            {isServiceApproved && <span className="ml-1 text-xs font-normal" style={{ color: "#16A34A" }}>service</span>}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                            ó 6 cuotas de ${calcCuota6(displayPrice)?.toLocaleString("es-AR")}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-center italic" style={{ color: "var(--muted)" }}>Consultar</p>
                      )}

                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleDecrease(p.productCode)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                          style={{ background: "var(--surface2)", color: "var(--text)" }}>−</button>
                        <span className="w-6 text-center font-bold text-sm" style={{ color: "var(--brand)" }}>{qty}</span>
                        <button onClick={() => handleIncrease(p.productCode)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                          style={{ background: "var(--surface2)", color: "var(--text)" }}>+</button>
                      </div>

                      <button
                        onClick={() => { addToCart(p, qty); toast.success("Agregado al pedido"); }}
                        disabled={p.inStock === false}
                        className="w-full text-white text-xs py-2 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: p.inStock !== false ? "var(--brand)" : "var(--muted2)" }}
                      >
                        {p.inStock !== false ? "Agregar" : "Sin stock"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div ref={loaderRef} className="h-4" />
          {isFetching && (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full"
                style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }} />
            </div>
          )}
          {!hasMore && allProducts.length > 0 && (
            <p className="text-center py-4 text-xs" style={{ color: "var(--muted)" }}>
              {allProducts.length} productos mostrados
            </p>
          )}
        </div>
      </div>

      {/* Drawer mobile overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 shadow-xl transform transition-transform duration-300 lg:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--surface)" }}>
        <Sidebar
          categories={categories} selectedCategory={category} selectedSubcategory={subcategory}
          onCategoryChange={(c) => { handleCategoryChange(c); setDrawerOpen(false); }}
          onSubcategoryChange={(s) => { handleSubcategoryChange(s); setDrawerOpen(false); }}
          brands={brands} selectedBrands={selectedBrands} onBrandToggle={handleBrandToggle}
          onClearAll={() => { handleClearAll(); setDrawerOpen(false); }}
          activeFilterCount={activeFilterCount} onClose={() => setDrawerOpen(false)}
        />
      </div>
    </>
  );
}

export default Catalogo;
