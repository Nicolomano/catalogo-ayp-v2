import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, Copy, Check, Package, X as CloseIcon } from "lucide-react";
import API from "../api/axios";
import { useCart } from "../Context/CartContext";
import { useAuth } from "../Context/AuthContext";
import toast from "react-hot-toast";
import { useReveal } from "../hooks/useIntersectionObserver.js";
import { useScrollProgress } from "../hooks/useScrollProgress.js";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://catalogoayp.vercel.app";

/* ── Ícono WhatsApp inline (no dependencia extra) ── */
function WaIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor">
      <path d="M16.003 2.667C8.638 2.667 2.667 8.638 2.667 16c0 2.358.627 4.67 1.817 6.694L2.667 29.333l6.825-1.789A13.29 13.29 0 0016.003 29.333c7.365 0 13.33-5.97 13.33-13.333S23.368 2.667 16.003 2.667zm6.059 18.264c-.331-.167-1.96-.968-2.264-1.079-.305-.107-.527-.167-.748.166-.223.33-.86 1.079-1.054 1.3-.196.222-.39.248-.72.083-.331-.166-1.398-.515-2.663-1.643-.984-.878-1.648-1.962-1.843-2.293-.194-.33-.02-.51.146-.674.15-.149.33-.389.496-.583.167-.194.222-.332.333-.554.11-.222.055-.416-.028-.583-.083-.167-.748-1.803-1.025-2.47-.27-.648-.545-.56-.748-.57l-.637-.011c-.222 0-.582.083-.888.415-.305.33-1.164 1.137-1.164 2.773 0 1.637 1.192 3.218 1.358 3.44.167.222 2.346 3.584 5.685 5.027.795.343 1.415.547 1.899.7.798.253 1.525.217 2.099.132.64-.096 1.97-.806 2.247-1.584.278-.778.278-1.445.194-1.584-.083-.14-.305-.222-.637-.389z"/>
    </svg>
  );
}

/* ── Tarjeta mini para productos relacionados ── */
function RelatedCard({ product }) {
  return (
    <Link
      to={`/product/${product.productCode}`}
      className="bento flex flex-col hover:shadow-lg transition-shadow group flex-shrink-0"
      style={{ width: "160px" }}
    >
      <div
        className="flex items-center justify-center rounded-t-[16px] p-3"
        style={{ background: "var(--surface2)", height: "120px" }}
      >
        {product.image
          ? <img src={product.image} alt={product.name} className="object-contain max-h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          : <Package className="h-10 w-10 opacity-15" style={{ color: "var(--muted)" }} />
        }
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <p className="text-xs line-clamp-2 font-medium leading-tight" style={{ color: "var(--text)" }}>
          {product.name}
        </p>
        {product.priceARS
          ? <p className="text-sm font-bold mt-1.5" style={{ color: "var(--brand)" }}>
              ${product.priceARS.toLocaleString("es-AR")}
            </p>
          : <p className="text-xs italic mt-1.5" style={{ color: "var(--muted)" }}>Consultar</p>
        }
      </div>
    </Link>
  );
}

function ProductDetail() {
  const { productCode }                    = useParams();
  const [product, setProduct]              = useState(null);
  const [loading, setLoading]              = useState(true);
  const [quantity, setQuantity]            = useState(1);
  const [related, setRelated]              = useState([]);
  const [copied, setCopied]                = useState(false);
  const [zoomOpen, setZoomOpen]            = useState(false);
  const { addToCart }                      = useCart();
  const { isServiceApproved, servicePrice } = useAuth();
  const scrollProgress = useScrollProgress();
  const relatedRef     = useReveal();

  /* Cargar producto */
  useEffect(() => {
    setLoading(true);
    setRelated([]);
    API.get(`/products/code/${productCode}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [productCode]);

  /* Cargar productos relacionados una vez que el producto está disponible */
  useEffect(() => {
    if (!product?.categories?.[0]) return;
    const cat = encodeURIComponent(product.categories[0]);
    API.get(`/products?category=${cat}&limit=9`)
      .then((r) => {
        const others = (r.data?.products || []).filter((p) => p._id !== product._id);
        setRelated(others.slice(0, 8));
      })
      .catch(() => {});
  }, [product]);

  const calcCuota6 = (price) => price ? Math.round((price * 1.3) / 6) : null;

  /* ── Compartir ── */
  const handleShare = async () => {
    const url  = `${SITE_URL}/product/${product.productCode}`;
    const text = `*A&P Refrigeración*\n${product.name}\nCódigo: ${product.productCode}${product.priceARS ? `\nPrecio: $${product.priceARS.toLocaleString("es-AR")}` : ""}\n\nVer producto: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url });
        return;
      } catch {
        // usuario canceló o fallo — fallback a copia
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleShareWA = () => {
    const url  = `${SITE_URL}/product/${product.productCode}`;
    const text = `*A&P Refrigeración*\n${product.name}\nCódigo: ${product.productCode}${product.priceARS ? `\nPrecio: $${product.priceARS.toLocaleString("es-AR")}` : ""}\n\nVer producto: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  /* ── Estados de carga / no encontrado ── */
  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="skeleton skeleton-text w-16 mb-6" />
      <div className="bento p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8" style={{ borderRadius: "24px" }}>
        <div className="skeleton rounded-2xl" style={{ minHeight: "320px" }} />
        <div className="flex flex-col gap-3">
          <div className="skeleton skeleton-text w-1/4" />
          <div className="skeleton" style={{ height: "2rem", borderRadius: "8px", width: "85%" }} />
          <div className="skeleton" style={{ height: "1.25rem", borderRadius: "8px", width: "55%" }} />
          <div className="skeleton skeleton-text w-full mt-2" />
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-3/4" />
          <div className="skeleton" style={{ height: "2.5rem", borderRadius: "8px", width: "40%", marginTop: "8px" }} />
          <div className="skeleton skeleton-btn mt-2" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-lg" style={{ color: "var(--muted)" }}>Producto no encontrado</p>
      <Link to="/catalogo" className="text-sm font-medium" style={{ color: "var(--brand)" }}>
        ← Volver
      </Link>
    </div>
  );

  const pageUrl      = `${SITE_URL}/product/${product.productCode}`;
  const description  = product.description?.slice(0, 155) || "";
  const displayPrice = isServiceApproved ? servicePrice(product.priceARS) : product.priceARS;

  return (
    <>
      {/* Barra de progreso de lectura */}
      <div
        className="fixed top-0 left-0 z-50 h-0.5 transition-all duration-100"
        style={{ width: `${scrollProgress}%`, background: "var(--brand)" }}
      />

      <Helmet>
        <title>{`${product.name} | A&P Refrigeración`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type"        content="product" />
        <meta property="og:title"       content={product.name} />
        <meta property="og:description" content={description} />
        <meta property="og:image"       content={product.image} />
        <meta property="og:url"         content={pageUrl} />
        <meta property="og:site_name"   content="A&P Refrigeración" />
        <meta name="twitter:card"       content="summary_large_image" />
        <meta name="twitter:image"      content={product.image} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org", "@type": "Product",
          name: product.name, description: product.description,
          image: product.image, sku: product.productCode, url: pageUrl,
          brand: { "@type": "Brand", name: "A&P Refrigeración" },
          ...(product.priceARS && {
            offers: { "@type": "Offer", priceCurrency: "ARS", price: product.priceARS,
              availability: "https://schema.org/InStock", url: pageUrl }
          }),
        })}</script>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <Link to="/catalogo"
          className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: "var(--muted)" }}>
          <ChevronLeft className="h-4 w-4" /> Volver
        </Link>

        {/* Card principal */}
        <div className="bento p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8" style={{ borderRadius: "24px" }}>

          {/* Imagen */}
          <div
            className="flex items-center justify-center rounded-2xl p-6 min-h-64 relative group"
            style={{ background: "var(--surface2)", cursor: product.image ? "zoom-in" : "default" }}
            onClick={() => product.image && setZoomOpen(true)}
          >
            {product.image
              ? <>
                  <img src={product.image} alt={product.name} className="object-contain max-h-80 w-full" />
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium px-2 py-1 rounded-lg"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>
                      Ampliar
                    </span>
                  </div>
                </>
              : <Package className="h-24 w-24 opacity-10" style={{ color: "var(--muted)" }} />
            }
          </div>

          {/* Lightbox */}
          {zoomOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.85)" }}
              onClick={() => setZoomOpen(false)}
            >
              <img
                src={product.image}
                alt={product.name}
                className="max-w-full max-h-[90vh] object-contain rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => setZoomOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/25"
                style={{ background: "rgba(255,255,255,0.15)" }}
              ><CloseIcon className="h-5 w-5" /></button>
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col">
            {product.brand && (
              <p className="text-sm font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                {product.brand}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: "var(--text)" }}>
              {product.name}
            </h1>
            <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
              Código: <span className="font-mono font-semibold">{product.productCode}</span>
            </p>

            {!product.inStock && (
              <span className="inline-block self-start text-xs font-semibold px-3 py-1 rounded-full mb-4"
                style={{ background: "#FEF2F2", color: "#DC2626" }}>
                Sin stock
              </span>
            )}

            {product.description && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
                {product.description}
              </p>
            )}

            {displayPrice ? (
              <div className="mb-6">
                <p className="text-3xl font-black" style={{ color: "var(--brand)" }}>
                  ${displayPrice.toLocaleString("es-AR")}
                  {isServiceApproved && (
                    <span className="ml-2 text-base font-semibold" style={{ color: "#16A34A" }}>service</span>
                  )}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  ó 6 cuotas de ${calcCuota6(displayPrice)?.toLocaleString("es-AR")}
                </p>
                {isServiceApproved && product.priceARS && (
                  <p className="text-xs mt-0.5 line-through" style={{ color: "var(--muted)" }}>
                    Precio público: ${product.priceARS.toLocaleString("es-AR")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-base italic mb-6" style={{ color: "var(--muted)" }}>Consultar precio</p>
            )}

            {/* Cantidad */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}>−</button>
              <span className="w-10 text-center text-xl font-bold" style={{ color: "var(--brand)" }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}>+</button>
            </div>

            {/* Agregar al pedido */}
            <button
              onClick={() => { addToCart(product, quantity); toast.success("Agregado al pedido"); }}
              disabled={!product.inStock}
              className="btn-primary w-full py-3 text-base mb-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {product.inStock ? "Agregar al pedido" : "Sin stock"}
            </button>

            {/* Botones de compartir */}
            <div className="flex gap-2">
              <button
                onClick={handleShareWA}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: "#25D366" }}
              >
                <WaIcon size={16} />
                Compartir
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
                title="Copiar link"
              >
                {copied ? <Check className="h-4 w-4" style={{ color: "#16A34A" }} /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </button>
            </div>
          </div>
        </div>

        {/* ── PRODUCTOS RELACIONADOS ── */}
        {related.length > 0 && (
          <section ref={relatedRef} className="mt-12 reveal">
            <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
              También te puede interesar
            </h2>
            {/* Scroll horizontal en móvil, grilla en desktop */}
            <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible md:grid-cols-4 lg:grid-cols-5"
              style={{ scrollbarWidth: "none" }}>
              {related.map((p) => (
                <RelatedCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

      </div>
    </>
  );
}

export default ProductDetail;
