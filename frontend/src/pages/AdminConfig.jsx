import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { DollarSign } from "lucide-react";

export default function AdminConfig() {
  const [exchangeRate, setExchangeRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/config")
      .then((res) => setExchangeRate(res.data.exchangeRate))
      .catch((err) => console.error("Error cargando config:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put("/config/", { exchangeRate });
      setExchangeRate(res.data.exchangeRate);
      toast.success("Cotización actualizada");
    } catch (err) {
      console.error("Error guardando config:", err);
      toast.error("No se pudo guardar");
    }
  };

  if (loading)
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Cargando…
      </p>
    );

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          Configuración
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          Ajustes generales del sistema.
        </p>
      </div>

      <div className="bento p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(234,179,8,0.12)" }}
          >
            <DollarSign size={20} style={{ color: "#B45309" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
              Cotización del dólar
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Usada para calcular precios en ARS a partir de USD
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex items-center gap-3">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
              style={{ color: "var(--muted)" }}
            >
              $
            </span>
            <input
              type="number"
              step="0.01"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="w-full border rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:ring-2 transition-colors"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
