import { useCart } from "../Context/CartContext.jsx";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ShoppingCart } from "lucide-react";
import API from "../api/axios";

function Cart() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const [loading, setLoading]           = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:ring-2"

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 flex flex-col items-center gap-4">
        <ShoppingCart className="h-16 w-16 opacity-20" style={{ color: "var(--muted)" }} />
        <p className="text-lg font-medium" style={{ color: "var(--muted)" }}>El pedido está vacío</p>
        <Link to="/catalogo"
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--brand)" }}>
          Ver catálogo
        </Link>
      </div>
    );
  }

  const total = cart.reduce((sum, item) => sum + (item.priceARS || 0) * item.quantity, 0);

  const handleConfirm = async () => {
    if (!customerName || !customerPhone) {
      alert("Por favor, ingresá tu nombre y teléfono.");
      return;
    }
    try {
      setLoading(true);
      const res = await API.post("/orders", {
        customerName,
        customerPhone,
        products: cart.map((item) => ({ productId: item._id, quantity: item.quantity })),
      });
      clearCart();
      window.open(res.data.waLink, "_blank");
    } catch (err) {
      console.error("Error creando orden:", err.response?.data || err);
      alert("Error al procesar la orden. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Tu pedido</h1>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {cart.map((item) => (
          <div key={item._id}
            className="bento p-4 flex items-center gap-4"
            style={{ borderRadius: "16px" }}>
            {/* Imagen */}
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--surface2)" }}>
              {item.image
                ? <img src={item.image} alt={item.name} className="object-contain max-h-full" />
                : <span className="text-2xl opacity-30">📦</span>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{item.name}</p>
              {item.priceARS && (
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--brand)" }}>
                  ${item.priceARS.toLocaleString("es-AR")} c/u
                </p>
              )}
              {/* Cantidad */}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}>−</button>
                <span className="w-8 text-center font-bold text-sm" style={{ color: "var(--brand)" }}>
                  {item.quantity}
                </span>
                <button onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}>+</button>
              </div>
            </div>

            {/* Subtotal + eliminar */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {item.priceARS && (
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  ${(item.priceARS * item.quantity).toLocaleString("es-AR")}
                </p>
              )}
              <button onClick={() => removeFromCart(item._id)}
                className="p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bento p-5 mb-6 flex items-center justify-between" style={{ borderRadius: "16px" }}>
        <span className="font-semibold" style={{ color: "var(--muted)" }}>Total estimado</span>
        <span className="text-2xl font-black" style={{ color: "var(--brand)" }}>
          ${total.toLocaleString("es-AR")}
        </span>
      </div>

      {/* Formulario */}
      <div className="bento p-6 mb-6 space-y-4" style={{ borderRadius: "16px" }}>
        <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>Tus datos</h2>
        <input type="text" placeholder="Tu nombre"
          value={customerName} onChange={(e) => setCustomerName(e.target.value)}
          className={inputCls}
          style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
        />
        <input type="text" placeholder="Tu teléfono (ej: 1122334455)"
          value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
          className={inputCls}
          style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={clearCart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
          style={{ borderColor: "#FECACA", color: "#DC2626", background: "#FEF2F2" }}>
          <Trash2 className="h-4 w-4" /> Vaciar
        </button>
        <button onClick={handleConfirm} disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--brand)" }}>
          {loading ? "Procesando…" : "✅ Finalizar pedido por WhatsApp"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: "var(--muted)" }}>
        ⚠️ Los precios son orientativos. La cotización final se envía por WhatsApp.
      </p>
    </div>
  );
}

export default Cart;
