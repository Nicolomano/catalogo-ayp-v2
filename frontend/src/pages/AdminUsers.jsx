import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { Users, Building2, ClipboardCheck, MapPin, Phone, Calendar } from "lucide-react";



const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado" };

const STATUS_STYLE = {
  pending:  { background: "rgba(234,179,8,0.15)",  color: "#B45309" },
  approved: { background: "rgba(22,163,74,0.15)",  color: "#16A34A" },
  rejected: { background: "rgba(220,38,38,0.12)",  color: "#DC2626" },
};

const FILTERS = ["pending", "approved", "rejected", "all"];
const FILTER_LABEL = { ...STATUS_LABEL, all: "Todos" };

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchUsers = async (status = filter) => {
    setLoading(true);
    try {
      const res = await API.get("/users", {
                params: status !== "all" ? { status } : {},
      });
      setUsers(res.data);
    } catch {
      toast.error("Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(filter); }, [filter]);

  const handleApprove = async (id) => {
    try {
      await API.patch(`/users/${id}/status`, { status: "approved" }, );
      toast.success("Usuario aprobado");
      fetchUsers();
    } catch {
      toast.error("Error al aprobar");
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await API.patch(
        `/users/${rejectModal.userId}/status`,
        { status: "rejected", rejectionReason: rejectReason },
        
      );
      toast.success("Usuario rechazado");
      setRejectModal(null);
      setRejectReason("");
      fetchUsers();
    } catch {
      toast.error("Error al rechazar");
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bento p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Registros de Services
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Aprobá o rechazá solicitudes de técnicos matriculados.
          </p>
        </div>
        {/* Filtros */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={
                filter === s
                  ? { background: "var(--brand)", color: "#fff" }
                  : { background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }
              }
            >
              {FILTER_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>
          Cargando…
        </p>
      ) : users.length === 0 ? (
        <div className="bento p-12 text-center">
          <Users size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--muted)" }}>No hay registros con este estado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u._id}
              className="bento p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Avatar inicial */}
              <div
                className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm"
                style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
              >
                {u.name?.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                    {u.name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={STATUS_STYLE[u.status]}
                  >
                    {STATUS_LABEL[u.status]}
                  </span>
                </div>

                <p className="text-xs" style={{ color: "var(--muted)" }}>{u.email}</p>

                <div
                  className="flex flex-wrap gap-x-4 gap-y-1 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {u.company && (
                    <span className="flex items-center gap-1">
                      <Building2 size={11} /> {u.company}
                    </span>
                  )}
                  {u.matricula && (
                    <span className="flex items-center gap-1">
                      <ClipboardCheck size={11} /> Mat. {u.matricula}
                    </span>
                  )}
                  {u.province && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {u.province}
                    </span>
                  )}
                  {u.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {u.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(u.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </div>

                {u.rejectionReason && (
                  <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                    Motivo de rechazo: {u.rejectionReason}
                  </p>
                )}
              </div>

              {/* Acciones (solo si está pendiente) */}
              {u.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(u._id)}
                    className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: "rgba(22,163,74,0.15)", color: "#16A34A" }}
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => setRejectModal({ userId: u._id, name: u.name })}
                    className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                    style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626" }}
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal rechazar */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
          >
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text)" }}>
                Rechazar a {rejectModal.name}
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Podés indicar el motivo del rechazo (opcional).
              </p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo…"
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors"
              style={{
                background: "var(--surface2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="px-4 py-2 rounded-xl text-sm transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "#DC2626", color: "#fff" }}
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
