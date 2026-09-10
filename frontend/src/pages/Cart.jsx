import { useCart } from "../Context/CartContext.jsx";
import { useAuth } from "../Context/AuthContext.jsx";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Trash2, ShoppingCart, Package, MessageCircle, Info, RefreshCw } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";

function Cart() {
  const { cart, removeFromCart, clearCart, updateQuantity, replaceCart } = useCart();
  const { isServiceApproved, servicePrice } = useAuth();
  const [loading, setLoading]             = useState(false);
  const [customerName, setCustomerName]   = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cambios, setCambios]             = useState(null);
  const yaRevalidado                      = useRef(false);

  // El carrito vive en el navegador sin vencimiento, con el precio congelado del
  // momento en que se agregó. Como el Excel se importa seguido, el cliente podía
  // ver un total y recibir otro en el WhatsApp. Acá se refresca al abrir.
  useEffect(() => {
    if (yaRevalidado.current) return;
    const ids = cart.map((i) => i._id).filter(Boolean);
    if (ids.length === 0) return;
    yaRevalidado.current = true;

    API.post("/products/revalidar", { ids })
      .then((res) => {
        const actuales = new Map((res.data?.productos || []).map((p) => [String(p._id), p]));
        const cambiados = [];
        const quitados = [];

        const nuevoCarrito = cart.flatMap((item) => {
          const actual = actuales.get(String(item._id));
          if (!actual) {
            quitados.push({ name: item.name, motivo: "ya no está disponible" });
            return [];
          }
          if (actual.inStock === false) {
            quitados.push({ name: actual.name, motivo: "quedó sin stock" });
            return [];
          }
          if (Number(actual.priceARS) !== Number(item.priceARS)) {
            cambiados.push({
              name: actual.name,
              antes: Number(item.priceARS) || 0,
              ahora: Number(actual.priceARS) || 0,
            });
          }
          // Se toma el dato fresco pero se conserva la cantidad elegida.
          return [{ ...item, ...actual, quantity: item.quantity }];
        });

        if (cambiados.length || quitados.length) {
          replaceCart(nuevoCarrito);
          setCambios({ cambiados, quitados });
        }
      })
      .catch(() => {
        // Si falla, se sigue con lo que hay: el backend igual cotiza con el
        // precio real al confirmar el pedido.
      });
  }, [cart, replaceCart]);

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-2"
          style={{ background: "var(--brand-tint)" }}
        >
          <ShoppingCart className="h-10 w-10 opacity-60" style={{ color: "var(--brand)" }} />
        </div>
        <p className="text-xl font-bold" style={{ color: "var(--text)" }}>El pedido está vacío</p>
        <p className="text-sm max-w-xs" style={{ color: "var(--muted)" }}>
          Agregá productos desde el catálogo para armar tu pedido
        </p>
        <Link to="/catalogo" className="btn-primary px-8 mt-2">
          Ver productos
        </Link>
      </div>
    );
  }

  // El precio que se muestra tiene que salir del mismo criterio que aplica el
  // backend al crear la orden, o el técnico ve un total y le cotizan otro.
  const precioUnitario = (item) =>
    (isServiceApproved ? servicePrice(item.priceARS) : item.priceARS) || 0;

  const total = cart.reduce((sum, item) => sum + precioUnitario(item) * item.quantity, 0);

  const handleConfirm = async () => {
    if (!customerName || !customerPhone) {
      toast.error("Por favor, ingresá tu nombre y teléfono.");
      return;
    }
    // Abrir la pestaña de WhatsApp YA, dentro del gesto del click: Safari bloquea
    // window.open llamado después de un await. Se abre vacía y luego se redirige.
    const waTab = window.open("", "_blank");
    try {
      setLoading(true);
      const res = await API.post("/orders", {
        customerName,
        customerPhone,
        products: cart.map((item) => ({ productId: item._id, quantity: item.quantity })),
      });
      // El backend descarta lo que ya no está publicado o quedó sin stock. Antes
      // desaparecía en silencio: el cliente pedía 5 cosas y el WhatsApp listaba 4.
      const descartados = res.data?.descartados || [];
      if (descartados.length) {
        const nombres = descartados.map((d) => d.name).filter(Boolean);
        toast(
          nombres.length
            ? `No se pudieron incluir: ${nombres.join(", ")}. Escribinos si los necesitás.`
            : `${descartados.length} producto(s) ya no están disponibles y quedaron fuera del pedido.`,
          { icon: "⚠️", duration: 8000 }
        );
      }

      clearCart();
      const link = res.data?.waLink;
      if (link) {
        if (waTab) waTab.location.href = link;   // redirige la pestaña ya abierta
        else window.location.href = link;         // si el popup fue bloqueado: misma pestaña
      } else {
        if (waTab) waTab.close();
        toast.success("Pedido registrado. Te contactamos por WhatsApp.");
      }
    } catch (err) {
      if (waTab) waTab.close();
      console.error("Error creando orden:", err.response?.data || err);
      toast.error("Error al procesar la orden. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>Tu pedido</h1>

      {/* Aviso de cambios desde la última vez, antes de que confirme */}
      {cambios && (
        <div
          className="rounded-2xl border p-4 mb-6"
          style={{ background: "rgba(234,179,8,0.08)", borderColor: "rgba(234,179,8,0.35)" }}
        >
          <p className="text-sm font-semibold flex items-center gap-1.5 mb-2" style={{ color: "#B45309" }}>
            <RefreshCw className="h-4 w-4" /> Actualizamos tu pedido
          </p>
          <ul className="text-sm space-y-1" style={{ color: "var(--text2)" }}>
            {cambios.cambiados.map((c, i) => (
              <li key={`p${i}`}>
                <strong>{c.name}</strong>: cambió de ${c.antes.toLocaleString("es-AR")} a{" "}
                <strong>${c.ahora.toLocaleString("es-AR")}</strong>
              </li>
            ))}
            {cambios.quitados.map((q, i) => (
              <li key={`q${i}`}>
                <strong>{q.name}</strong> se quitó porque {q.motivo}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setCambios(null)}
            className="text-xs font-semibold mt-3 hover:underline"
            style={{ color: "#B45309" }}
          >
            Entendido
          </button>
        </div>
      )}

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
              {item.priceARS > 0 && (
                <p className="text-sm font-bold mt-0.5" style={{ color: "var(--brand)" }}>
                  ${precioUnitario(item).toLocaleString("es-AR")} c/u
                  {isServiceApproved && (
                    <span className="ml-1 text-xs font-semibold" style={{ color: "#16A34A" }}>
                      service
                    </span>
                  )}
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
              {item.priceARS > 0 && (
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  ${(precioUnitario(item) * item.quantity).toLocaleString("es-AR")}
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
