import { useEffect, useState } from "react";
import API, { descargarConToken } from "../api/axios";
import toast from "react-hot-toast";
import { Users, Building2, MapPin, Phone, Calendar, CreditCard, ImageIcon, X, Hash, Pencil, AlertTriangle, Clock, Search, Download } from "lucide-react";
import { PROVINCES } from "../utils/provincias.js";

const STATUS_LABEL = {
  pending: "Pendiente",
  awaiting: "Faltan datos",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_STYLE = {
  pending:  { background: "rgba(234,179,8,0.15)",  color: "#B45309" },
  // Distinto del pendiente a propósito: acá la pelota la tiene el técnico.
  awaiting: { background: "rgba(79,70,229,0.12)",  color: "#4F46E5" },
  approved: { background: "rgba(22,163,74,0.15)",  color: "#16A34A" },
  rejected: { background: "rgba(220,38,38,0.12)",  color: "#DC2626" },
};

const FILTERS = ["pending", "awaiting", "approved", "rejected", "all"];
const FILTER_LABEL = { ...STATUS_LABEL, all: "Todos" };

const inputCls = "border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [awaitingModal, setAwaitingModal] = useState(null);
  const [awaitingText, setAwaitingText] = useState("");
  const [clientNumbers, setClientNumbers] = useState({});
  const [imageModal, setImageModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  /**
   * Búsqueda sobre lo que ya está cargado: el listado trae todos los técnicos
   * del estado elegido, así que filtrar acá es instantáneo y no suma consultas.
   *
   * Sin tildes y sin puntos, para que "Perez" encuentre a "Pérez" y
   * "20123456786" encuentre a quien lo cargó como "20-12345678-6".
   */
  const normalizar = (v) =>
    String(v ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const termino = normalizar(busqueda).trim();
  const soloNumeros = termino.replace(/\D/g, "");

  const visibles = !termino
    ? users
    : users.filter((u) => {
        const texto = normalizar(
          [u.name, u.email, u.company, u.province, u.clientNumber].filter(Boolean).join(" ")
        );
        if (texto.includes(termino)) return true;
        // CUIT, DNI y teléfono se comparan sin guiones ni espacios.
        if (!soloNumeros) return false;
        return [u.cuit, u.dni, u.phone, u.clientNumber]
          .filter(Boolean)
          .some((campo) => String(campo).replace(/\D/g, "").includes(soloNumeros));
      });

  const descargarContactos = async () => {
    try {
      await descargarConToken("/users/export/contactos", "contactos.csv");
      toast.success("Descargado. Subilo a la lista de envíos.");
    } catch {
      toast.error("No se pudo descargar el archivo");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const { _id, name, email, cuit, phone, company, province, clientNumber, acceptsMarketing } = editModal;
      const res = await API.patch(`/users/${_id}`, {
        name, email, cuit, phone, company, province, clientNumber,
        acceptsMarketing: Boolean(acceptsMarketing),
      });
      setUsers((prev) => prev.map((u) => (u._id === _id ? res.data : u)));
      setEditModal(null);
      toast.success("Datos actualizados");
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudieron guardar los cambios");
    } finally {
      setSavingEdit(false);
    }
  };

  // La matrícula es un documento personal: ya no viaja como URL pública del
  // bucket. Se pide por un endpoint autenticado y se muestra desde un blob local,
  // porque un <img src> no puede mandar el header Authorization.
  const verMatricula = async (userId) => {
    try {
      const res = await API.get(`/users/${userId}/matricula`, { responseType: "blob" });
      // Puede ser una foto o un PDF: el técnico sube lo que tiene.
      setImageModal({
        url: URL.createObjectURL(res.data),
        esPdf: res.data.type === "application/pdf",
      });
    } catch {
      toast.error("No se pudo cargar la matrícula");
    }
  };

  const cerrarModal = () => {
    if (imageModal?.url?.startsWith("blob:")) URL.revokeObjectURL(imageModal.url);
    setImageModal(null);
  };

  const fetchUsers = async (status = filter) => {
    setLoading(true);
    try {
      const res = await API.get("/users", { params: status !== "all" ? { status } : {} });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(filter); }, [filter]);

  const handleApprove = async (id) => {
    const clientNumber = clientNumbers[id]?.trim();
    if (!clientNumber) {
      toast.error("Ingresá el número de cliente antes de aprobar");
      return;
    }
    try {
      const res = await API.patch(`/users/${id}/status`, { status: "approved", clientNumber });
      if (res.data?.emailSent === true) {
        toast.success("Usuario aprobado · email enviado");
      } else if (res.data?.emailSent === false) {
        toast.error("Usuario aprobado pero el email no se pudo enviar", { duration: 8000 });
      } else {
        toast.success("Usuario aprobado");
      }
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al aprobar");
    }
  };

  const handleAwaiting = async () => {
    if (!awaitingModal) return;
    if (!awaitingText.trim()) { toast.error("Escribí qué dato le estás pidiendo"); return; }
    try {
      const res = await API.patch(
        `/users/${awaitingModal.userId}/status`,
        { status: "awaiting", awaitingReason: awaitingText.trim() },
      );
      toast.success(
        res.data?.emailSent === false
          ? "Marcado, pero el email no se pudo enviar"
          : "Marcado · le pedimos el dato por email",
      );
      setAwaitingModal(null);
      setAwaitingText("");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo marcar");
    }
  };
  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error("Ingresá el motivo del rechazo"); return; }
    try {
      await API.patch(
        `/users/${rejectModal.userId}/status`,
        { status: "rejected", rejectionReason: rejectReason.trim() },
      );
      toast.success("Usuario rechazado · email enviado");
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
        <div className="flex gap-1.5 flex-wrap items-center">
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
          <button
            onClick={descargarContactos}
            title="CSV con los aprobados que aceptaron recibir novedades, para subir al sistema de envíos"
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            style={{ background: "rgba(22,163,74,0.12)", color: "#16A34A" }}
          >
            <Download size={13} /> Contactos
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: "220px" }}>
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email, CUIT, DNI, teléfono, empresa o N.º de cliente"
            className="w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 transition-colors"
            style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>
        {termino && (
          <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
            {visibles.length} de {users.length}
          </span>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="bento p-12 text-center">
          <Users size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <p style={{ color: "var(--muted)" }}>
            {termino
              ? `No hay resultados para “${busqueda}”.`
              : "No hay registros con este estado."}
          </p>
          {termino && (
            <button
              onClick={() => setBusqueda("")}
              className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
            >
              Limpiar la búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((u) => (
            <div key={u._id} className="bento p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Avatar */}
                <div
                  className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm"
                  style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                >
                  {u.name?.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{u.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={STATUS_STYLE[u.status]}
                    >
                      {STATUS_LABEL[u.status]}
                    </span>
                    {u.clientNumber && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                        style={{ background: "rgba(0,51,204,0.1)", color: "var(--brand)" }}
                      >
                        <Hash size={10} /> {u.clientNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-xs" style={{ color: "var(--muted)" }}>{u.email}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
                    {u.cuit && (
                      <span className="flex items-center gap-1">
                        <CreditCard size={11} /> CUIT: {u.cuit}
                      </span>
                    )}
                    {u.dni && !u.cuit && (
                      <span className="flex items-center gap-1">
                        <CreditCard size={11} /> DNI: {u.dni}
                      </span>
                    )}
                    {u.company && (
                      <span className="flex items-center gap-1">
                        <Building2 size={11} /> {u.company}
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

                  {/* Qué se le pidió, para no tener que acordarse. */}
                  {u.status === "awaiting" && u.awaitingReason && (
                    <p
                      className="flex items-start gap-1.5 text-xs rounded-lg px-2 py-1.5 mt-1"
                      style={{ background: "rgba(79,70,229,0.10)", color: "#4F46E5" }}
                    >
                      <Clock size={12} className="shrink-0 mt-0.5" />
                      <span>Le pedimos: {u.awaitingReason}</span>
                    </p>
                  )}
                  {/* No bloquea la aprobación: el número puede estar mal tipeado
                      o el técnico puede no estar inscripto. Decide quien aprueba. */}
                  {u.avisoIdentificacion && (
                    <p
                      className="flex items-start gap-1.5 text-xs rounded-lg px-2 py-1.5 mt-1"
                      style={{ background: "rgba(234,179,8,0.12)", color: "#B45309" }}
                    >
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{u.avisoIdentificacion}</span>
                    </p>
                  )}

                  {/* Imagen de matrícula */}
                  {u.hasMatricula && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => verMatricula(u._id)}
                        className="flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline transition"
                        style={{ color: "var(--brand)" }}
                      >
                        <ImageIcon size={12} />
                        Ver matrícula
                      </button>
                    </div>
                  )}
                  {!u.hasMatricula && (
                    <p className="text-xs italic" style={{ color: "var(--muted)" }}>
                      Sin matrícula cargada
                    </p>
                  )}

                  {u.rejectionReason && (
                    <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                      Motivo de rechazo: {u.rejectionReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Acciones — mientras no esté resuelto. "Faltan datos" también las
                  muestra: cuando el técnico manda lo que faltaba, se aprueba desde acá. */}
              {(u.status === "pending" || u.status === "awaiting") && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs font-medium shrink-0" style={{ color: "var(--text)" }}>
                      N.º cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Asignar número de cliente"
                      value={clientNumbers[u._id] ?? ""}
                      onChange={(e) =>
                        setClientNumbers((prev) => ({ ...prev, [u._id]: e.target.value }))
                      }
                      className={inputCls + " flex-1"}
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(u._id)}
                      disabled={!clientNumbers[u._id]?.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                      style={{ background: "rgba(22,163,74,0.15)", color: "#16A34A" }}
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => {
                        setAwaitingModal({ userId: u._id, name: u.name });
                        setAwaitingText(u.awaitingReason || "");
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: "rgba(79,70,229,0.12)", color: "#4F46E5" }}
                    >
                      Faltan datos
                    </button>
                    <button
                      onClick={() => setRejectModal({ userId: u._id, name: u.name })}
                      className="px-4 py-2 rounded-xl text-xs font-medium transition-colors"
                      style={{ background: "rgba(220,38,38,0.10)", color: "#DC2626" }}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              {/* Editar datos — disponible en cualquier estado: los técnicos
                  cambian de teléfono o cargan mal el CUIT. */}
              <div className="pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={() => setEditModal({ ...u })}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                >
                  <Pencil size={12} /> Editar datos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar datos */}
      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
          >
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Editar datos del técnico
            </h3>
            <form onSubmit={handleEdit} className="space-y-4">
              {[
                { label: "Nombre", key: "name", type: "text", required: true },
                { label: "Email", key: "email", type: "email", required: true },
                { label: "CUIT, CUIL o DNI", key: "cuit", type: "text", required: true },
                { label: "Teléfono", key: "phone", type: "text" },
                { label: "Empresa", key: "company", type: "text" },
                { label: "N.º de cliente", key: "clientNumber", type: "text" },
              ].map(({ label, key, type, required }) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                    {label}
                  </span>
                  <input
                    type={type}
                    value={editModal[key] || ""}
                    onChange={(e) => setEditModal((p) => ({ ...p, [key]: e.target.value }))}
                    className={inputCls + " w-full"}
                    style={inputStyle}
                    required={required}
                  />
                </label>
              ))}

              <label className="block">
                <span className="text-xs font-medium mb-1 block" style={{ color: "var(--muted)" }}>
                  Provincia
                </span>
                <select
                  value={editModal.province || ""}
                  onChange={(e) => setEditModal((p) => ({ ...p, province: e.target.value }))}
                  className={inputCls + " w-full"}
                  style={inputStyle}
                >
                  <option value="">— Sin especificar —</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              {/* Para poder darlo de baja si lo pide por teléfono o WhatsApp. */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editModal.acceptsMarketing)}
                  onChange={(e) => setEditModal((p) => ({ ...p, acceptsMarketing: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 shrink-0"
                  style={{ accentColor: "var(--brand)" }}
                />
                <span className="text-sm" style={{ color: "var(--text)" }}>
                  Acepta recibir novedades por email
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>
                    Solo entran en las circulares los aprobados que tengan esto tildado.
                  </span>
                </span>
              </label>

              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                La contraseña no se edita desde acá. Si el técnico la perdió, puede pedir un
                enlace de recuperación desde la pantalla de inicio de sesión.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "var(--surface2)", color: "var(--text)" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                  style={{ background: "var(--brand)" }}
                >
                  {savingEdit ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal imagen de matrícula */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={cerrarModal}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={cerrarModal}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white z-10"
              style={{ background: "#DC2626" }}
            >
              <X size={16} />
            </button>
            {imageModal.esPdf ? (
              <>
                <iframe
                  src={imageModal.url}
                  title="Matrícula"
                  className="rounded-2xl w-full bg-white"
                  style={{ height: "80vh", border: "none" }}
                />
                {/* Salida de emergencia: algunos navegadores —sobre todo en
                    celular— no muestran PDF dentro de un iframe. */}
                <a
                  href={imageModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute -bottom-10 left-0 text-sm underline"
                  style={{ color: "#fff" }}
                >
                  Abrir en una pestaña nueva
                </a>
              </>
            ) : (
              <img
                src={imageModal.url}
                alt="Matrícula"
                className="rounded-2xl w-full object-contain"
                style={{ maxHeight: "80vh" }}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal faltan datos */}
      {awaitingModal && (
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
                ¿Qué le falta a {awaitingModal.name}?
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                Se lo pedimos por email y la solicitud sale de la bandeja de pendientes hasta que conteste.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                "La foto o el PDF de la matrícula",
                "El CUIT o CUIL",
                "Un teléfono de contacto",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setAwaitingText(sug)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-colors"
                  style={{ background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {sug}
                </button>
              ))}
            </div>
            <textarea
              value={awaitingText}
              onChange={(e) => setAwaitingText(e.target.value)}
              placeholder="Ej: la foto o el PDF de la matrícula"
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors"
              style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setAwaitingModal(null); setAwaitingText(""); }}
                className="px-4 py-2 rounded-xl text-sm transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAwaiting}
                disabled={!awaitingText.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                style={{ background: "#4F46E5", color: "#fff" }}
              >
                Pedir por email
              </button>
            </div>
          </div>
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
                Indicá el motivo del rechazo para notificar al usuario.
              </p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo…"
              rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors"
              style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
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
                disabled={!rejectReason.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
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
