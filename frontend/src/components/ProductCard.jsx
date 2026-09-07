import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../Context/AuthContext.jsx";
import { useCart } from "../Context/CartContext.jsx";
import { calcCuota6 } from "../utils/pricing.js";
import { formatTitle } from "../utils/text.js";

/** Bloque para productos sin foto: se ve intencional, no como un error de carga. */
function ImagePlaceholder({ product }) {
  const brand = product.brand?.trim();
  const fallback = (product.categories?.[0] || product.name || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className="w-full h-full flex items-center justify-center px-3"
      style={{ background: "var(--brand-tint)" }}
    >
      <span
        className={`font-black text-center leading-none line-clamp-2 ${
          brand ? "text-base sm:text-lg tracking-tight" : "text-5xl"
        }`}
        style={{ color: "var(--brand)", opacity: 0.45 }}
      >
        {brand || fallback}
      </span>
    </div>
  );
}

/**
 * Card de producto del sitio público (home, carrusel y catálogo).
 * El bloque de precio y acciones queda FUERA del <Link> para que tocar el
 * stepper no navegue a la ficha.
 *
 * @param {object}  product
 * @param {boolean} showInstallments - mostrar la cuota en 6
 */
export default function ProductCard({ product, showInstallments = true }) {
  const { isServiceApproved, servicePrice } = useAuth();
  const { cart, addToCart, updateQuantity } = useCart();

  const displayPrice = isServiceApproved ? servicePrice(product.priceARS) : product.priceARS;
  const outOfStock = product.inStock === false;

  // La cantidad sale del carrito real: así el stepper refleja lo que hay en el
  // pedido y no un estado local que quedaba pegado después de agregar.
  const qty = cart.find((i) => i._id === product._id)?.quantity || 0;

  const handleAdd = () => {
    addToCart(product, 1);
    toast.success("Agregado al pedido");
  };

  const stepBtn =
    "min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center text-base font-bold transition-colors";

  return (
    <div className="bento bento-link product-card flex flex-col h-full group">
      <Link to={`/product/${product.productCode}`} className="flex flex-col">
        <div className="product-img-wrap rounded-t-[20px] relative">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="object-contain max-h-full w-full h-full p-4 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <ImagePlaceholder product={product} />
          )}
          {outOfStock && (
            <span
              className="absolute top-1.5 left-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--error-tint)", color: "var(--error)" }}
            >
              Sin stock
            </span>
          )}
          <div className="product-card-overlay rounded-t-[20px]">
            <span className="text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
              Ver producto
            </span>
          </div>
        </div>

        <div className="px-3 pt-3">
          {product.brand && (
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-semibold line-clamp-2" style={{ color: "var(--text)" }}>
            {formatTitle(product.name)}
          </h3>
        </div>
      </Link>

      <div className="px-3 pt-2 pb-3 mt-auto flex flex-col gap-2">
        {displayPrice ? (
          <div>
            <p className="text-base font-bold" style={{ color: "var(--brand)" }}>
              ${displayPrice.toLocaleString("es-AR")}
              {isServiceApproved && (
                <span className="ml-1 text-xs font-semibold" style={{ color: "#16A34A" }}>
                  service
                </span>
              )}
            </p>
            {showInstallments && (
              <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                ó 6 cuotas de ${calcCuota6(displayPrice)?.toLocaleString("es-AR")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: "var(--muted)" }}>
            Consultar precio
          </p>
        )}

        {qty === 0 ? (
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {outOfStock ? "Sin stock" : "Agregar"}
          </button>
        ) : (
          <div
            className="flex items-center justify-between rounded-xl p-1"
            style={{ background: "var(--brand-tint)", minHeight: "44px" }}
          >
            <button
              onClick={() => updateQuantity(product._id, qty - 1)}
              aria-label="Quitar uno"
              className={stepBtn}
              style={{ background: "var(--surface)", color: "var(--brand)" }}
            >
              −
            </button>
            <span className="font-bold text-sm" style={{ color: "var(--brand)" }}>
              {qty}
            </span>
            <button
              onClick={() => updateQuantity(product._id, qty + 1)}
              aria-label="Agregar uno"
              className={stepBtn}
              style={{ background: "var(--surface)", color: "var(--brand)" }}
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
