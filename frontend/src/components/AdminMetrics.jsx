import { useEffect, useState } from "react";
import API from "../api/axios";
import {
  ShoppingCart, DollarSign, Receipt, Clock, TrendingUp,
  Search, SearchX, UserCheck, AlertTriangle, Eye, Users,
} from "lucide-react";

const PERIODOS = [
  { dias: 7, label: "7 días" },
  { dias: 30, label: "30 días" },
  { dias: 90, label: "90 días" },
];

const money = (n) => `$${(n || 0).toLocaleString("es-AR")}`;

function Tarjeta({ Icon, label, valor, detalle, tint, accent }) {
  return (
    <div className="bento p-5 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: tint, color: accent }}
      >
        {/* Guard: el ESLint del proyecto no cuenta el uso en JSX de un prop
            desestructurado con mayúscula y lo marca como variable sin usar. */}
        {Icon && <Icon size={20} />}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none" style={{ color: "var(--text)" }}>{valor}</p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{label}</p>
        {detalle && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted2)" }}>{detalle}</p>
        )}
      </div>
    </div>
  );
}

/** Lista top-N con barra proporcional. Evita sumar una librería de gráficos. */
function TopLista({ items, getLabel, getValor, sufijo = "", vacio }) {
  if (!items?.length) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>{vacio}</p>;
  }
  const max = Math.max(...items.map(getValor), 1);
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs truncate" style={{ color: "var(--text)" }}>{getLabel(it)}</span>
            <span className="text-xs font-semibold shrink-0" style={{ color: "var(--muted)" }}>
              {getValor(it)}{sufijo}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${(getValor(it) / max) * 100}%`, background: "var(--brand)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Serie diaria como un polyline SVG: para dos formas simples no hace falta más. */
function Serie({ datos, campo = "pedidos", etiqueta = "pedidos" }) {
  if (!datos?.length) return null;
  const W = 600, H = 90;
  const max = Math.max(...datos.map((d) => d[campo]), 1);
  const paso = datos.length > 1 ? W / (datos.length - 1) : W;
  const puntos = datos
    .map((d, i) => `${(i * paso).toFixed(1)},${(H - (d[campo] / max) * (H - 8) - 4).toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 90 }}>
        <polyline
          points={puntos}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--muted2)" }}>
        <span>{datos[0]?.fecha}</span>
        <span>pico: {max} {etiqueta}/día</span>
        <span>{datos[datos.length - 1]?.fecha}</span>
      </div>
    </div>
  );
}

export default function AdminMetrics() {
  const [dias, setDias] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    API.get("/dashboard/metrics", { params: { dias } })
      .then((r) => setData(r.data))
      .catch((e) => {
        console.error("Error cargando métricas:", e);
        setError(e.response?.data?.message || "No se pudieron cargar las métricas.");
      })
      .finally(() => setLoading(false));
  }, [dias]);

  if (loading && !data) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>Cargando métricas…</p>;
  }
  // Antes, ante un error el componente devolvía null: la sección desaparecía
  // entera sin decir nada y parecía que las métricas no existían.
  if (error && !data) {
    return (
      <div className="bento p-8 text-center">
        <p className="text-sm font-semibold" style={{ color: "var(--error)" }}>{error}</p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          Probá recargar la página. Si sigue igual, revisá la consola del navegador (F12).
        </p>
      </div>
    );
  }
  if (!data) return null;

  const { pedidos, productos, busquedas, tecnicos, visitas } = data;
  const diasEspera = pedidos.pendienteMasViejo
    ? Math.floor((Date.now() - new Date(pedidos.pendienteMasViejo)) / 86400000)
    : null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Métricas</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Datos de tu tienda en los últimos {dias} días.
          </p>
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              onClick={() => setDias(p.dias)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={
                dias === p.dias
                  ? { background: "var(--brand)", color: "#fff" }
                  : { background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Visitas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta Icon={Users} label="Visitas" valor={visitas?.total ?? 0}
          detalle="personas distintas"
          tint="rgba(124,58,237,0.12)" accent="#7C3AED" />
        <Tarjeta Icon={Eye} label="Páginas vistas" valor={visitas?.paginasVistas ?? 0}
          detalle={
            visitas?.total
              ? `${(visitas.paginasVistas / visitas.total).toFixed(1)} por visita`
              : null
          }
          tint="rgba(124,58,237,0.12)" accent="#7C3AED" />
        <Tarjeta Icon={TrendingUp} label="Visitas que compran"
          valor={visitas?.total ? `${((pedidos.cantidad / visitas.total) * 100).toFixed(1)}%` : "—"}
          detalle={visitas?.total ? `${pedidos.cantidad} de ${visitas.total}` : "sin datos aún"}
          tint="rgba(22,163,74,0.12)" accent="#16A34A" />
        <Tarjeta Icon={Search} label="Búsquedas" valor={busquedas.top.reduce((a, b) => a + b.veces, 0)}
          detalle={`${busquedas.sinResultados.length} términos sin resultado`}
          tint="var(--brand-tint)" accent="var(--brand)" />
      </div>

      {visitas?.serie?.length > 1 && (
        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <Users size={15} /> Visitas por día
          </h3>
          <Serie datos={visitas.serie} campo="visitas" etiqueta="visitas" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <Eye size={15} /> Páginas más vistas
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Dónde pasa el tiempo la gente.
          </p>
          <TopLista
            items={visitas?.paginas || []}
            getLabel={(p) => p.path}
            getValor={(p) => p.vistas}
            vacio="Todavía no hay visitas registradas."
          />
        </div>
        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <TrendingUp size={15} /> De dónde llegan
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            "Directo" es quien escribe la dirección o entra desde un favorito.
          </p>
          <TopLista
            items={(visitas?.canales || []).filter((ca) => ca.canal !== "interno")}
            getLabel={(ca) => ca.canal}
            getValor={(ca) => ca.visitas}
            vacio="Todavía no hay visitas registradas."
          />
        </div>
      </div>

      {/* ── Pedidos ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta Icon={ShoppingCart} label="Pedidos" valor={pedidos.cantidad}
          tint="var(--brand-tint)" accent="var(--brand)" />
        <Tarjeta Icon={DollarSign} label="Facturación" valor={money(pedidos.facturacion)}
          tint="rgba(22,163,74,0.12)" accent="#16A34A" />
        <Tarjeta Icon={Receipt} label="Ticket promedio" valor={money(pedidos.ticketPromedio)}
          tint="rgba(0,51,204,0.10)" accent="var(--brand)" />
        <Tarjeta Icon={Clock} label="Sin responder" valor={pedidos.pendientes}
          detalle={diasEspera !== null ? `el más viejo, hace ${diasEspera} día${diasEspera !== 1 ? "s" : ""}` : null}
          tint="rgba(234,179,8,0.15)" accent="#B45309" />
      </div>

      {pedidos.serie?.length > 1 && (
        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <TrendingUp size={15} /> Pedidos por día
          </h3>
          <Serie datos={pedidos.serie} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <SearchX size={15} /> Búsquedas sin resultados
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Lo que te buscan y no encuentran. Puede ser stock que falta, o un producto que
            está cargado con otro nombre.
          </p>
          <TopLista
            items={busquedas.sinResultados}
            getLabel={(b) => b.term}
            getValor={(b) => b.veces}
            vacio="Todavía no hay búsquedas sin resultados en este período."
          />
        </div>

        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <Search size={15} /> Búsquedas más frecuentes
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Qué escribe la gente en el buscador.
          </p>
          <TopLista
            items={busquedas.top}
            getLabel={(b) => b.term}
            getValor={(b) => b.veces}
            vacio="Todavía no hay búsquedas registradas."
          />
        </div>

        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <ShoppingCart size={15} /> Productos más pedidos
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Unidades pedidas en el período.
          </p>
          <TopLista
            items={productos.topPedidos}
            getLabel={(p) => p.name || p.productCode}
            getValor={(p) => p.unidades}
            vacio="Todavía no hay pedidos en este período."
          />
        </div>

        <div className="bento p-5">
          <h3 className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <Eye size={15} /> Se miran y no se piden
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            Muchas visitas y pocos pedidos. Suele ser el precio, la foto o que está sin stock.
          </p>
          {productos.pocaConversion?.length ? (
            <div className="space-y-2">
              {productos.pocaConversion.map((p) => (
                <div key={p.productCode} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs truncate" style={{ color: "var(--text)" }}>
                    {p.name}
                    {p.inStock === false && (
                      <span className="ml-1.5 text-[10px] font-semibold" style={{ color: "var(--error)" }}>
                        sin stock
                      </span>
                    )}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
                    {p.views} vistas · {p.soldCount} pedidos
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
              Todavía no hay suficientes visitas para calcularlo.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta Icon={UserCheck} label="Técnicos aprobados" valor={tecnicos.approved}
          tint="rgba(22,163,74,0.12)" accent="#16A34A" />
        <Tarjeta Icon={Clock} label="Pendientes de aprobar" valor={tecnicos.pending}
          tint="rgba(234,179,8,0.15)" accent="#B45309" />
        <Tarjeta Icon={AlertTriangle} label="Esperando +3 días" valor={tecnicos.pendientesViejos}
          tint="rgba(220,38,38,0.10)" accent="#DC2626" />
        <Tarjeta Icon={UserCheck} label={`Registros (${dias}d)`} valor={tecnicos.nuevos}
          tint="var(--brand-tint)" accent="var(--brand)" />
      </div>
    </section>
  );
}
