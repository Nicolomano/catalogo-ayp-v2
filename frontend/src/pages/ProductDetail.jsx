import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import API from "../api/axios";
import { useCart } from "../Context/CartContext";
import toast from "react-hot-toast";

const SITE_URL = "https://catalogoayp.vercel.app";

function ProductDetail() {
  const { productCode } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const { addToCart } = useCart();

  useEffect(() => {
    API.get(`/products/code/${productCode}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [productCode]);

  const calcCuota6 = (priceARS) => {
    if (!priceARS || isNaN(priceARS)) return null;
    const cuota = (priceARS * 1.27) / 6;
    return Math.round(cuota);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-ayp">
        <p className="text-white text-xl">Cargando producto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-ayp">
        <p className="text-white text-xl">Producto no encontrado</p>
      </div>
    );
  }

  const pageUrl = `${SITE_URL}/product/${product.productCode}`;
  const description = product.description?.slice(0, 155) || "";

  return (
    <>
      <Helmet>
        {/* Primary */}
        <title>{`${product.name} | A&P Refrigeración`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph — para preview en WhatsApp y redes */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={product.image} />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="800" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:site_name" content="A&P Refrigeración" />
        <meta property="og:locale" content="es_AR" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={product.image} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: product.image,
            sku: product.productCode,
            url: pageUrl,
            brand: {
              "@type": "Brand",
              name: "A&P Refrigeración",
            },
            ...(product.priceARS && {
              offers: {
                "@type": "Offer",
                priceCurrency: "ARS",
                price: product.priceARS,
                availability: "https://schema.org/InStock",
                url: pageUrl,
              },
            }),
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-ayp p-8 flex justify-center">
        <div className="bg-white rounded-2xl shadow-lg max-w-4xl w-full p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Imagen */}
          <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
            <img
              src={product.image}
              alt={product.name}
              className="object-contain max-h-96"
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-gray-600 mb-6">{product.description}</p>
              )}
              {product.priceARS && (
                <p className="text-3xl font-bold text-blue-700 mb-8">
                  {product.priceARS.toLocaleString("es-AR")} ARS
                </p>
              )}
              {product.priceARS && (
                <p className="text-[11px] sm:text-xs text-gray-500 text-center -mt-2 mb-3">
                  ó 6 cuotas de{" "}
                  <strong className="font-semibold text-gray-600">
                    ${calcCuota6(product.priceARS)?.toLocaleString("es-AR")}
                  </strong>{" "}
                  <span className="whitespace-nowrap"></span>
                </p>
              )}
            </div>

            {/* Controles cantidad */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setQuantity(quantity > 1 ? quantity - 1 : 1)}
                className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-lg"
              >
                −
              </button>
              <span className="text-xl font-bold text-blue-700">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-lg"
              >
                +
              </button>
            </div>

            {/* Botón agregar */}
            <button
              onClick={() => {
                addToCart(product, quantity);
                toast.success("Producto agregado al carrito");
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-3 text-lg font-semibold"
            >
              🛒 Agregar al pedido
            </button>

            {/* Volver */}
            <Link
              to="/"
              className="mt-6 text-blue-600 hover:underline text-sm text-center"
            >
              ← Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProductDetail;
