import { useCart } from "../Context/CartContext.jsx";
import { useState } from "react";
import API from "../api/axios";

function Cart() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  if (cart.length === 0) {
    return <p className="text-center text-lg">🛒 El carrito está vacío</p>;
  }

  const total = cart.reduce(
    (sum, item) => sum + item.priceARS * item.quantity,
    0
  );

  const handleConfirm = async () => {
    if (!customerName || !customerPhone) {
      alert("Por favor, ingresa tu nombre y teléfono.");
      return;
    }

    try {
      setLoading(true);

      // Construir payload para el backend
      const payload = {
        customerName,
        customerPhone,
        products: cart.map((item) => ({
          productId: item._id, // 👈 importante, ID real del producto
          quantity: item.quantity,
        })),
      };

      // Enviar al backend
      const res = await API.post("/orders", payload);
      const { waLink } = res.data;

      // Vaciar carrito después de confirmar
      clearCart();

      // Abrir WhatsApp con el link generado en backend
      window.open(waLink, "_blank");
    } catch (err) {
      console.error("❌ Error creando orden:", err.response?.data || err);
      alert("Error al procesar la orden. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tu pedido</h1>

      <ul className="space-y-4">
        {cart.map((item) => (
          <li
            key={item._id}
            className="flex justify-between items-center bg-white text-ayp p-4 rounded-lg shadow"
          >
            <div>
              <h2 className="font-bold">{item.name}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(item._id, item.quantity - 1)
                  }
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                >
                  −
                </button>
                <span className="px-4 text-lg font-bold">{item.quantity}</span>
                <button
                  onClick={() =>
                    updateQuantity(item._id, item.quantity + 1)
                  }
                  className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
                >
                  +
                </button>
              </div>
              <p>{item.priceARS.toLocaleString("es-AR")} ARS c/u</p>
            </div>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              onClick={() => removeFromCart(item._id)}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xl font-bold">
        Total: {total.toLocaleString("es-AR")} ARS
      </p>

      {/* Formulario de cliente */}
      <div className="mt-6 space-y-4">
        <input
          type="text"
          placeholder="Tu nombre"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full px-4 py-2 rounded border"
        />
        <input
          type="text"
          placeholder="Tu teléfono (ej: 1122334455)"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="w-full px-4 py-2 rounded border"
        />
      </div>

      {/* Acciones */}
      <div className="mt-6 flex space-x-4">
        <button
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          onClick={clearCart}
        >
          Vaciar carrito
        </button>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {loading ? "Procesando..." : "Finalizar pedido"}
        </button>
      </div>
      <p className="mt-6 text-center text-sm text-gray-500 italic">
        ⚠️ Los precios son orientativos y pueden variar sin previo aviso. La
        cotización final será enviada por WhatsApp.
      </p>
    </div>
  );
}

export default Cart;
