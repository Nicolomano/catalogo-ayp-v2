import { useEffect, useState, useMemo, useTransition, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { SlidersHorizontal, BadgeCheck, Search } from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../Context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { slug, porSlug, urlCategoria } from "../utils/slug.js";
import {
  TITULO_CATALOGO,
  DESCRIPCION_CATALOGO,
  tituloCategoria,
  descripcionCategoria,
} from "../utils/seo.js";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.refrigeracionayp.com";

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
  const [categoriasListas, setCategoriasListas] = useState(false);

  // La categoría sale de la URL: /catalogo/lavarropas/bombas. La URL trae el
  // slug, y el nombre real (con tildes y mayúsculas, que es lo que filtra el
  // servidor) se resuelve cuando llega la lista de categorías.
  const { cat: catSlug, sub: subSlug } = useParams();
  const [category, setCategory]           = useState("all");
  const [subcategory, setSubcategory]     = useState("all");
  // Mientras no se sabe a qué categoría corresponde la URL, no se busca nada:
  // si no, la primera carga traía todo el catálogo y se veía un parpadeo de
  // productos que no eran de esa categoría.
  const [resuelto, setResuelto] = useState(
    () => !catSlug && !new URLSearchParams(window.location.search).get("cat")
  );
  const [sort, setSort]                   = useState("soldCount:desc");
  const [brands, setBrands]               = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  // Término corregido con el que el servidor encontró resultados, cuando lo
  // escrito no devolvía nada ("lokring" → "lockring").
  const [correccion, setCorreccion]       = useState(null);
  // Lo más vendido, para no dejar la pantalla vacía cuando no hay resultados.
  const [sugeridos, setSugeridos]         = useState([]);

  // Cuántos resultados vio la persona, y para qué término: se manda junto con
  // la búsqueda al registrarla. Va en ref para no re-disparar el efecto. Lleva
  // el término porque con la red lenta la respuesta puede tardar más que el
  // registro, y se mandaba el total de la búsqueda anterior.
  const ultimoTotal = useRef({ termino: null, total: 0 });
  // Qué término ya se registró, para registrarlo UNA vez. El efecto del registro
  // depende de allProducts (para esperar los resultados), y allProducts cambia
  // con cada página que se carga al scrollear: sin esto, buscar "ruleman" y
  // bajar tres páginas contaba como tres búsquedas.
  const registrada = useRef(null);

  const loaderRef = useRef(null);
  const location  = useLocation();
  const navigate  = useNavigate();
  const params    = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  /**
   * Registro de la búsqueda, aparte de la búsqueda misma.
   *
   * La búsqueda dispara a los 400 ms para que se sienta instantánea; el
   * registro espera 1,5 s, cuando la persona ya dejó de escribir. Si no, las
   * métricas cuentan teclas en vez de intenciones: "ma", "mani" y "manifold"
   * figuraban como tres búsquedas distintas de la misma persona.
   */
  useEffect(() => {
    // Un término nuevo se puede volver a registrar (buscar A, después B, y
    // volver a A son tres búsquedas de verdad).
    registrada.current = null;
  }, [debouncedSearch]);

  useEffect(() => {
    const termino = debouncedSearch.trim();
    if (termino.length < 2 || registrada.current === termino) return;
    // Todavía no llegaron los resultados de ESTE término: cuando lleguen,
    // allProducts cambia y este efecto vuelve a correr.
    if (ultimoTotal.current.termino !== debouncedSearch) return;
    const t = setTimeout(() => {
      registrada.current = termino;
      API.post("/metrics/search", { term: termino, resultCount: ultimoTotal.current.total })
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [debouncedSearch, allProducts]);

  useEffect(() => {
    API.get("/products/meta/categories").then((res) => {
      const data = Array.isArray(res.data) ? res.data : [];
      const normalized = data.length && typeof data[0] === "string"
        ? data.map((c) => ({ category: c, subcategories: [] })) : data;
      setCategories(normalized);
    }).catch(() => {})
      // Lista o no, se marca como lista: si falló, una URL de categoría termina
      // en el catálogo entero en vez de quedar cargando para siempre.
      .finally(() => setCategoriasListas(true));
    API.get("/products/brands").then((res) => setBrands(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!categoriasListas) return;

    // Links viejos (/catalogo?cat=Lavarropas): a la URL nueva, reemplazando la
    // entrada del historial para que "atrás" no vuelva a la vieja.
    const vieja = params.get("cat");
    if (vieja) {
      navigate(urlCategoria(vieja, params.get("sub")), { replace: true });
      return;
    }

    const sel = catSlug ? categories.find((c) => slug(c.category) === slug(catSlug)) : null;
    if (catSlug && !sel) {
      // Una categoría que ya no existe: al catálogo entero, sin dejar la URL rota.
      navigate("/catalogo", { replace: true });
      return;
    }
    setCategory(sel ? sel.category : "all");
    setSubcategory(sel && subSlug ? porSlug(sel.subcategories, subSlug) || "all" : "all");
    setResuelto(true);
  }, [categoriasListas, categories, catSlug, subSlug, params, navigate]);

  useEffect(() => {
    isFetchingRef.current = true;  // bloquear observer durante el reset
    setIsFetching(true);
    setPage(1); setAllProducts([]); setHasMore(true);
  }, [category, subcategory, sort, debouncedSearch, selectedBrands]);

  useEffect(() => {
    if (!resuelto) return;
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
        // El servidor avisa cuando tuvo que corregir lo escrito, y cuando no
        // encontró nada manda lo más vendido para no dejar la pantalla vacía.
        if (page === 1) {
          setCorreccion(res.data?.correccion || null);
          setSugeridos(res.data?.sugeridos || []);
          ultimoTotal.current = { termino: debouncedSearch, total: res.data?.total ?? 0 };
        }
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
  }, [resuelto, category, subcategory, sort, debouncedSearch, selectedBrands, page]);

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

  // Las categorías del costado son links: la navegación la hacen ellas, y la
  // categoría elegida sale de la URL (efecto de arriba). Acá solo queda lo que
  // no es navegación.
  const handleBrandToggle = (brand) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  const handleClearAll = () => {
    setSelectedBrands([]); setSearch("");
    navigate("/catalogo");
  };

  const activeFilterCount = (category !== "all" ? 1 : 0) + (subcategory !== "all" ? 1 : 0) + selectedBrands.length;

  const elegida = categories.find((c) => c.category === category);
  const sub = subcategory !== "all" ? subcategory : null;

  return (
    <>
      {/* Los mismos textos que la página que se le arma a Google
          (frontend/api/og-categoria.js): salen de utils/seo.js. */}
      <Helmet>
        <title>{category !== "all" ? tituloCategoria(category, sub) : TITULO_CATALOGO}</title>
        <meta
          name="description"
          content={
            category !== "all"
              ? descripcionCategoria(category, elegida?.subcategories || [], sub)
              : DESCRIPCION_CATALOGO
          }
        />
        <link rel="canonical" href={`${SITE_URL}${urlCategoria(category, subcategory)}`} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-60 shrink-0">
          {/* overflowY va inline a propósito. `.bento` fija `overflow: hidden`
              para recortar las esquinas redondeadas, y en Tailwind 4 el CSS propio
              queda FUERA de @layer, así que le gana a la utilidad `overflow-y-auto`
              aunque tengan la misma especificidad: la lista de categorías se
              cortaba y no se llegaba a las de abajo. */}
          <div
            className="bento bento-quieto sticky top-24 max-h-[calc(100vh-7rem)]"
            style={{ borderRadius: "16px", overflowY: "auto" }}
          >
            <Sidebar
              categories={categories} selectedCategory={category} selectedSubcategory={subcategory}
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
          {/* flex-wrap: en el celular el orden baja a su propia línea. Antes
              estaba oculto debajo de 640px y desde el teléfono no había forma de
              ordenar por precio. */}
          <div className="flex flex-wrap gap-2 mb-4">
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

            <div className="relative flex-1 min-w-0">
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
              aria-label="Ordenar productos"
              className="w-full sm:w-auto rounded-xl px-3 py-2.5 text-sm outline-none border"
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

          {/* Aviso cuando lo escrito no daba resultados y el servidor lo corrigió
              hacia una palabra que sí está en el catálogo. */}
          {correccion && allProducts.length > 0 && (
            <div
              className="flex items-start gap-2 text-sm rounded-xl px-3 py-2.5 mb-4"
              style={{ background: "var(--brand-tint)", color: "var(--text2)" }}
            >
              <Search className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "var(--brand)" }} />
              <span>
                No encontramos nada con <strong>«{debouncedSearch}»</strong>. Te mostramos
                resultados para <strong>{correccion}</strong>.
              </span>
            </div>
          )}

          {/* Grid de productos */}
          {(isFetching || isPending) && allProducts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: SKELETON_INITIAL }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : allProducts.length === 0 ? (
            /* Sin resultados: en vez de una pantalla vacía, lo más vendido de
               donde estaba buscando. Van aparte y bien titulados, para que no se
               confundan con lo que se buscó. */
            sugeridos.length > 0 ? (
              <div>
                <p className="text-center text-base" style={{ color: "var(--text2)" }}>
                  No encontramos nada con <strong>«{debouncedSearch}»</strong>.
                </p>
                <p className="text-center text-sm mt-1 mb-5" style={{ color: "var(--muted)" }}>
                  Esto es lo que más nos piden:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {sugeridos.map((p) => <ProductCard key={p._id} product={p} />)}
                </div>
              </div>
            ) : (
              <p className="text-center py-16 text-lg" style={{ color: "var(--muted)" }}>
                No se encontraron productos.
              </p>
            )
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
          onSelect={() => setDrawerOpen(false)}
          brands={brands} selectedBrands={selectedBrands} onBrandToggle={handleBrandToggle}
          onClearAll={() => { handleClearAll(); setDrawerOpen(false); }}
          activeFilterCount={activeFilterCount} onClose={() => setDrawerOpen(false)}
        />
      </div>
    </>
  );
}

export default Catalogo;
