import { useEffect, useState } from "react";
import axios from "../api/axios";
import { Package, CheckCircle, XCircle, DollarSign } from "lucide-react";

const STAT_CARD = [
  {
    key: "totalProductos",
    label: "Total productos",
    Icon: Package,
    accent: "var(--brand)",
    tint: "var(--brand-tint)",
  },
  {
    key: "productosActivos",
    label: "Activos",
    Icon: CheckCircle,
    accent: "#16A34A",
    tint: "rgba(22,163,74,0.10)",
  },
  {
    key: "productosInactivos",
    label: "Inactivos",
    Icon: XCircle,
    accent: "#DC2626",
    tint: "rgba(220,38,38,0.10)",
  },
];

export default function DashboardData() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get("/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!data)
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Cargando métricas…
      </p>
    );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARD.map(({ key, label, Icon, accent, tint }) => (
        <div
          key={key}
          className="bento p-5 flex items-center gap-4"
        >
          <div
            className="rounded-2xl p-3 shrink-0"
            style={{ background: tint }}
          >
            <Icon size={22} style={{ color: accent }} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              {data[key]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {label}
            </p>
          </div>
        </div>
      ))}

      {/* Dólar */}
      <div className="bento p-5 flex items-center gap-4">
        <div
          className="rounded-2xl p-3 shrink-0"
          style={{ background: "rgba(234,179,8,0.12)" }}
        >
          <DollarSign size={22} style={{ color: "#B45309" }} strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            ${data.exchangeRate}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Cotización USD
          </p>
        </div>
      </div>
    </div>
  );
}
