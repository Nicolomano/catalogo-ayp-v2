import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { MessageCircle } from "lucide-react";

const inputCls = "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

export default function AdminConfig() {
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    API.get("/site-config")
      .then((res) => {
        setAdminWhatsapp(res.data.adminWhatsapp ?? "");
      })
      .catch((err) => console.error("Error cargando config:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveWhatsapp = async (e) => {
    e.preventDefault();
    setSavingWa(true);
    try {
      await API.put("/site-config/", { adminWhatsapp: adminWhatsapp.trim() });
      toast.success("WhatsApp de administración guardado");
    } catch (err) {
      console.error("Error guardando adminWhatsapp:", err);
      toast.error("No se pudo guardar");
    } finally {
      setSavingWa(false);
    }
  };

  if (loading)
    return <p className="text-sm" style={{ color: "var(--muted)" }}>Cargando…</p>;

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Configuración</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Ajustes generales del sistema.</p>
      </div>

      {/* La cotización del dólar se ocultó: todos los precios salen del Excel
          en pesos, así que este campo solo servía para equivocarse. El endpoint
          y el recálculo siguen existiendo por si alguna vez vuelve a hacer falta. */}

      {/* WhatsApp administración */}
      <div className="bento p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(37,211,102,0.12)" }}
          >
            <MessageCircle size={20} style={{ color: "#16A34A" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>WhatsApp de administración</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Para técnicos sin matrícula en el formulario de registro. Formato: 5491112345678
            </p>
          </div>
        </div>
        <form onSubmit={handleSaveWhatsapp} className="flex items-center gap-3">
          <input
            type="text"
            value={adminWhatsapp}
            onChange={(e) => setAdminWhatsapp(e.target.value)}
            placeholder="5491112345678"
            className={inputCls + " flex-1"}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={savingWa}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            {savingWa ? "…" : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
