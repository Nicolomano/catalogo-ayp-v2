import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ChevronLeft } from "lucide-react";
import API from "../api/axios";
import { useCart } from "../Context/CartContext";
import { useAuth } from "../Context/AuthContext";
import toast from "react-hot-toast";

const SITE_URL = import.meta.env.VITE_SITE_URL || "https://catalogoayp.vercel.app";

function ProductDetail() {
  const { productCode }                   = useParams();
  const [product, setProduct]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [quantity, setQuantity]           = useState(1);
  const { addToCart }                     = useCart();
  const { isServiceApproved, servicePrice } = useAuth();

  useEffect(() => {
    API.get(`/products/code/${productCode}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [productCode]);

  const calcCuota6 = (price) => price ? Math.round((price * 1.3) / 6) : null;

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin h-10 w-10 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }} />
    </div>
  );

  if (!product) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <p className="text-lg" style={{ color: "var(--muted)" }}>Producto no encontrado</p>
      <Link to="/catalogo" className="text-sm font-medium" style={{ color: "var(--brand)" }}>
        ← Volver al catálogo
      </Link>
    </div>
  );

  const pageUrl    = `${SITE_URL}/product/${product.productCode}`;
  const description = product.description?.slice(0, 155) || "";
  const displayPrice = isServiceApproved ? servicePrice(product.priceARS) : product.priceARS;

  return (
    <>
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
          <ChevronLeft className="h-4 w-4" /> Volver al catálogo
        </Link>

        <div className="bento p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8" style={{ borderRadius: "24px" }}>
          {/* Imagen */}
          <div className="flex items-center justify-center rounded-2xl p-6 min-h-64"
            style={{ background: "var(--surface2)" }}>
            {product.image
              ? <img src={product.image} alt={product.name} className="object-contain max-h-80 w-full" />
              : <div className="text-6xl opacity-20">📦</div>
            }
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {product.brand && (
              <p className="text-sm font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                {product.brand}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>
              {product.name}
            </h1>

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
                  <p className="text-xs mt-0.5 line-through" style={{ color: "var(--muted2)" }}>
                    Precio público: ${product.priceARS.toLocaleString("es-AR")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-base italic mb-6" style={{ color: "var(--muted)" }}>Consultar precio</p>
            )}

            {/* Cantidad */}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}>−</button>
              <span className="w-10 text-center text-xl font-bold" style={{ color: "var(--brand)" }}>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}>+</button>
            </div>

            <button
              onClick={() => { addToCart(product, quantity); toast.success("Agregado al pedido"); }}
              disabled={!product.inStock}
              className="w-full py-3 rounded-xl text-white font-semibold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--brand)" }}
            >
              {product.inStock ? "🛒 Agregar al pedido" : "Sin stock"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductDetail;
