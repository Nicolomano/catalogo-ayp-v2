import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

const AUTH = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado" };
const STATUS_COLOR = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // { userId, name }
  const [rejectReason, setRejectReason] = useState("");

  const fetchUsers = async (status = filter) => {
    setLoading(true);
    try {
      const res = await API.get("/users", {
        headers: AUTH(),
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
      await API.patch(`/users/${id}/status`, { status: "approved" }, { headers: AUTH() });
      toast.success("Usuario aprobado");
      fetchUsers();
    } catch { toast.error("Error al aprobar"); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await API.patch(`/users/${rejectModal.userId}/status`,
        { status: "rejected", rejectionReason: rejectReason },
        { headers: AUTH() }
      );
      toast.success("Usuario rechazado");
      setRejectModal(null);
      setRejectReason("");
      fetchUsers();
    } catch { toast.error("Error al rechazar"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Registros de Services</h2>
          <p className="text-sm text-gray-500">Aprobá o rechazá solicitudes de services matriculados.</p>
        </div>
        <div className="flex gap-2">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              {s === "all" ? "Todos" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Cargando...</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-400 py-8">No hay registros con este estado.</p>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u._id} className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-gray-800">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[u.status]}`}>
                    {STATUS_LABEL[u.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{u.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  {u.company && <span>🏢 {u.company}</span>}
                  {u.matricula && <span>📋 Mat. {u.matricula}</span>}
                  {u.province && <span>📍 {u.province}</span>}
                  {u.phone && <span>📞 {u.phone}</span>}
                  <span>📅 {new Date(u.createdAt).toLocaleDateString("es-AR")}</span>
                </div>
                {u.rejectionReason && (
                  <p className="text-xs text-red-500 mt-1">Motivo rechazo: {u.rejectionReason}</p>
                )}
              </div>
              {u.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleApprove(u._id)}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg">
                    ✅ Aprobar
                  </button>
                  <button onClick={() => setRejectModal({ userId: u._id, name: u.name })}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg">
                    ❌ Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal rechazar */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg mb-2">Rechazar a {rejectModal.name}</h3>
            <p className="text-sm text-gray-500 mb-3">
              Podés indicar el motivo del rechazo (opcional).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
                Cancelar
              </button>
              <button onClick={handleReject}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600">
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
