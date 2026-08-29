import { useEffect, useState } from "react";
import API from "../api/axios";
import { ClipboardList, Phone, Calendar, BadgeCheck, Clock, ChevronDown, ChevronUp } from "lucide-react";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    API.get("/orders")
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error cargando órdenes:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "pendiente" ? "contestada" : "pendiente";
    try {
      const res = await API.patch(`/orders/${id}/status`, { status: newStatus });
      setOrders(orders.map((o) => (o._id === id ? res.data : o)));
    } catch (err) {
      console.error("Error actualizando estado:", err);
    }
  };

  if (loading)
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Cargando órdenes…
      </p>
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Órdenes
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          {orders.length} orden{orders.length !== 1 ? "es" : ""} registrada{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bento p-12 text-center">
          <ClipboardList size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--muted)" }}>No hay órdenes registradas todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="bento overflow-hidden">
              {/* Cabecera — toda clickeable para ver el detalle */}
              {(() => {
                const hasProducts = order.products?.length > 0;
                const isOpen = !!expanded[order._id];
                const onHeaderClick = () => { if (hasProducts) toggleExpand(order._id); };
                return (
                  <div
                    className={`p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${hasProducts ? "cursor-pointer hover:bg-[var(--surface2)]" : ""}`}
                    onClick={onHeaderClick}
                    role={hasProducts ? "button" : undefined}
                    tabIndex={hasProducts ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (hasProducts && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleExpand(order._id); }
                    }}
                  >
                    {/* Ícono de estado */}
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: order.status === "pendiente" ? "rgba(234,179,8,0.15)" : "rgba(22,163,74,0.15)" }}>
                        {order.status === "pendiente"
                          ? <Clock size={18} style={{ color: "#B45309" }} />
                          : <BadgeCheck size={18} style={{ color: "#16A34A" }} />}
                      </div>
                    </div>

                    {/* Info cliente */}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                          {order.customerName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: order.status === "pendiente" ? "rgba(234,179,8,0.15)" : "rgba(22,163,74,0.15)",
                            color: order.status === "pendiente" ? "#B45309" : "#16A34A",
                          }}>
                          {order.status === "pendiente" ? "Pendiente" : "Contestada"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
                        <span className="flex items-center gap-1"><Phone size={11} />{order.customerPhone}</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(order.createdAt).toLocaleString("es-AR")}
                        </span>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>
                          {order.totalARS?.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      {/* Afordance del detalle */}
                      {hasProducts ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium mt-0.5" style={{ color: "var(--brand)" }}>
                          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isOpen ? "Ocultar productos" : `Ver productos (${order.products.length})`}
                        </span>
                      ) : (
                        <span className="text-xs italic mt-0.5 inline-block" style={{ color: "var(--muted)" }}>
                          Sin detalle de productos
                        </span>
                      )}
                    </div>

                    {/* Acciones — el botón de estado no dispara el desplegado */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(order._id, order.status); }}
                        className="px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                        style={{
                          background: order.status === "pendiente" ? "rgba(22,163,74,0.12)" : "rgba(234,179,8,0.12)",
                          color: order.status === "pendiente" ? "#16A34A" : "#B45309",
                        }}>
                        Marcar como {order.status === "pendiente" ? "contestada" : "pendiente"}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Detalle de productos (expandible) */}
              {expanded[order._id] && order.products?.length > 0 && (
                <div className="border-t px-5 pb-5 pt-3 space-y-2" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                    Productos del pedido
                  </p>
                  {order.products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{p.name}</p>
                        {p.productCode && (
                          <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>#{p.productCode}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {p.quantity} × {p.priceARS?.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          = {(p.quantity * p.priceARS)?.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
