import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { useAuth } from "../Context/AuthContext.jsx";

/**
 * Card de producto "de descubrimiento" (navegación, sin acciones de carrito).
 * Usada en la home: grid de destacados y dentro del ProductCarousel.
 */
export default function ProductCard({ product }) {
  const { isServiceApproved, servicePrice } = useAuth();
  const displayPrice = isServiceApproved ? servicePrice(product.priceARS) : product.priceARS;

  return (
    <Link
      to={`/product/${product.productCode}`}
      className="bento product-card flex flex-col group h-full"
    >
      <div className="product-img-wrap rounded-t-[20px] p-4 relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="object-contain max-h-full w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Package className="h-10 w-10 opacity-15" style={{ color: "var(--muted)" }} />
        )}
        {product.inStock === false && (
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
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
          {product.brand || ""}
        </p>
        <h3 className="text-sm font-semibold line-clamp-2 flex-1" style={{ color: "var(--text)" }}>
          {product.name}
        </h3>
        {displayPrice ? (
          <p className="text-base font-bold mt-2" style={{ color: "var(--brand)" }}>
            ${displayPrice.toLocaleString("es-AR")}
            {isServiceApproved && (
              <span className="ml-1 text-xs font-semibold" style={{ color: "#16A34A" }}>service</span>
            )}
          </p>
        ) : (
          <p className="text-sm italic mt-2" style={{ color: "var(--muted)" }}>Consultar precio</p>
        )}
      </div>
    </Link>
  );
}
