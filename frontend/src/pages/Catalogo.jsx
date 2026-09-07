import { useEffect, useState, useMemo, useTransition, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SlidersHorizontal, X, Package, BadgeCheck } from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../Context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ProductCard from "../components/ProductCard.jsx";

const PAGE_SIZE = 24;
const SKELETON_INITIAL = 8;
const SKELETON_MORE = 4;

function ProductCardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-image" style={{ borderRadius: "20px 20px 0 0" }} />
      <div className="p-3 space-y-2">
        <div className="skeleton skeleton-text w-1/3" />
        <div className="skeleton skeleton-title w-full" />
        <div className="skeleton skeleton-title w-4/5" />
        <div className="skeleton skeleton-text w-1/2 mt-2" />
        <div className="skeleton skeleton-btn mt-2" />
      </div>
    </div>
  );
}

function Catalogo() {
  const [allProducts, setAllProducts] = useState([]);
  const [isFetching, setIsFetching]   = useState(true);
  const [hasMore, setHasMore]         = useState(true);
  const [page, setPage]               = useState(1);
  const [isPending, startTransition]  = useTransition();

  // Ref para que el observer siempre lea el valor actual sin recrearse
  const isFetchingRef = useRef(true);

  const { isServiceApproved } = useAuth();

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
      const data = Array.isArray(res.data) ? res.data : [];
      const normalized = data.length && typeof data[0] === "string"
        ? data.map((c) => ({ category: c, subcategories: [] })) : data;
      setCategories(normalized);
    }).catch(() => {});
    API.get("/products/brands").then((res) => setBrands(Array.isArray(res.data) ? res.data : [])).catch(() => {});
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
      .finally(() => {
        if (!controller.signal.aborted) {
          isFetchingRef.current = false;
          setIsFetching(false);
        }
      });

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

  // Categoría y subcategoría se eligen juntas desde el sidebar (tocar una
  // categoría solo despliega; el filtro se aplica al elegir dentro).
  const handleSelect = (cat, sub = "all") => {
    setCategory(cat);
    setSubcategory(sub);
    const u = new URL(window.location.href);
    if (cat === "all") u.searchParams.delete("cat");
    else u.searchParams.set("cat", cat);
    if (sub === "all") u.searchParams.delete("sub");
    else u.searchParams.set("sub", sub);
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
        <title>{category !== "all" ? `${category} | A&P Refrigeración` : "Productos | A&P Refrigeración"}</title>
        <meta name="description" content={category !== "all" ? `Productos de ${category} en A&P Refrigeración.` : "Tienda online de A&P Refrigeración. Repuestos de refrigeración comercial e industrial."} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="bento sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto" style={{ borderRadius: "16px" }}>
            <Sidebar
              categories={categories} selectedCategory={category} selectedSubcategory={subcategory}
              onSelect={handleSelect}
              brands={brands} selectedBrands={selectedBrands} onBrandToggle={handleBrandToggle}
              onClearAll={handleClearAll} activeFilterCount={activeFilterCount}
            />
          </div>
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">

          {/* Sin banner acá a propósito: el buscador y los filtros tienen que ser
              lo primero que se ve, sobre todo en mobile. Las promos van en la Home. */}

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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "var(--brand)",
                        animation: "dotBounce 1s ease infinite",
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
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
              <BadgeCheck className="h-4 w-4 flex-shrink-0" /> Estás viendo precios con <strong>10% de descuento service</strong>
            </div>
          )}

          {/* Grid de productos */}
          {(isFetching || isPending) && allProducts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: SKELETON_INITIAL }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : allProducts.length === 0 ? (
            <p className="text-center py-16 text-lg" style={{ color: "var(--muted)" }}>
              No se encontraron productos.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {allProducts.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}

          <div ref={loaderRef} className="h-4" />
          {(isFetching || isPending) && allProducts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-3">
              {Array.from({ length: SKELETON_MORE }).map((_, i) => <ProductCardSkeleton key={i} />)}
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
          onSelect={(c, s) => { handleSelect(c, s); setDrawerOpen(false); }}
          brands={brands} selectedBrands={selectedBrands} onBrandToggle={handleBrandToggle}
          onClearAll={() => { handleClearAll(); setDrawerOpen(false); }}
          activeFilterCount={activeFilterCount} onClose={() => setDrawerOpen(false)}
        />
      </div>
    </>
  );
}

export default Catalogo;
