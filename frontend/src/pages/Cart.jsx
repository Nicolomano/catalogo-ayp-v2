import { useCart } from "../Context/CartContext.jsx";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ShoppingCart, Package, MessageCircle, Info } from "lucide-react";
import API from "../api/axios";

function Cart() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const [loading, setLoading]             = useState(false);
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 flex flex-col items-center gap-4">
        <ShoppingCart className="h-16 w-16 opacity-15" style={{ color: "var(--muted)" }} />
        <p className="text-lg font-semibold" style={{ color: "var(--muted)" }}>El pedido está vacío</p>
        <Link to="/catalogo" className="btn-primary px-6">
          Ver productos
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
          <div key={item._id} className="bento p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: "var(--surface2)" }}>
              {item.image
                ? <img src={item.image} alt={item.name} className="object-contain max-h-full" />
                : <Package className="h-7 w-7 opacity-20" style={{ color: "var(--muted)" }} />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{item.name}</p>
              {item.priceARS && (
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--brand)" }}>
                  ${item.priceARS.toLocaleString("es-AR")} c/u
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold transition-colors hover:bg-[var(--brand)] hover:text-white"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}>−</button>
                <span className="w-8 text-center font-bold text-sm" style={{ color: "var(--brand)" }}>
                  {item.quantity}
                </span>
                <button onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center font-bold transition-colors hover:bg-[var(--brand)] hover:text-white"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}>+</button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {item.priceARS && (
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  ${(item.priceARS * item.quantity).toLocaleString("es-AR")}
                </p>
              )}
              <button onClick={() => removeFromCart(item._id)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bento p-5 mb-6 flex items-center justify-between">
        <span className="font-semibold" style={{ color: "var(--muted)" }}>Total estimado</span>
        <span className="text-2xl font-black" style={{ color: "var(--brand)" }}>
          ${total.toLocaleString("es-AR")}
        </span>
      </div>

      {/* Formulario */}
      <div className="bento p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-base" style={{ color: "var(--text)" }}>Tus datos</h2>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Nombre
          </label>
          <input type="text" placeholder="Tu nombre completo"
            value={customerName} onChange={(e) => setCustomerName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Teléfono
          </label>
          <input type="text" placeholder="Ej: 1122334455"
            value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={clearCart}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.02]"
          style={{ borderColor: "#FECACA", color: "#DC2626", background: "#FEF2F2", minHeight: "44px" }}>
          <Trash2 className="h-4 w-4" /> Vaciar
        </button>
        <button onClick={handleConfirm} disabled={loading}
          className="btn-primary flex-1 disabled:opacity-50">
          <MessageCircle className="h-4 w-4" />
          {loading ? "Procesando…" : "Finalizar pedido por WhatsApp"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs flex items-center justify-center gap-1.5" style={{ color: "var(--muted)" }}>
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        Los precios son orientativos. La cotización final se envía por WhatsApp.
      </p>
    </div>
  );
}

export default Cart;
