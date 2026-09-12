import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { PlusCircle, Trash2, ShieldCheck, KeyRound, Users } from "lucide-react";
import { useConfirm } from "../Context/ConfirmContext.jsx";
import { readTokenPayload, esAdminTotal } from "../utils/auth.js";

const inputCls =
  "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

// Mismo mínimo que exige el backend (MIN_PASS_ADMIN en authController.js).
const MIN_PASS = 12;

const NIVELES = [
  {
    value: "limitado",
    label: "Limitado",
    ayuda: "El día a día: productos, pedidos, técnicos, banners, categorías y métricas.",
  },
  {
    value: "total",
    label: "Total",
    ayuda:
      "Todo lo anterior más importar Excel, borrar productos, cambiar la configuración del sitio y administrar usuarios.",
  },
];

/** Volver al login: al cambiar la contraseña el token propio queda invalidado. */
function cerrarSesion() {
  localStorage.removeItem("token");
  window.location.href = "/admin/login";
}

export default function AdminAdministradores() {
  const confirm = useConfirm();
  const total = esAdminTotal();
  const yo = readTokenPayload();

  const [admins, setAdmins] = useState([]);
  const [cargando, setCargando] = useState(total);
  const [nuevo, setNuevo] = useState({ username: "", password: "", nivel: "limitado" });
  const [guardando, setGuardando] = useState(false);
  const [miPass, setMiPass] = useState({ actual: "", nueva: "", repetir: "" });

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await API.get("/auth/admins");
      setAdmins(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudieron cargar los administradores");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (total) cargar();
  }, [total]);

  const crear = async (e) => {
    e.preventDefault();
    if (!nuevo.username.trim()) return toast.error("Escribí un nombre de usuario");
    if (nuevo.password.length < MIN_PASS) {
      return toast.error(`La contraseña tiene que tener al menos ${MIN_PASS} caracteres`);
    }
    setGuardando(true);
    try {
      await API.post("/auth/register", {
        username: nuevo.username.trim(),
        password: nuevo.password,
        nivel: nuevo.nivel,
      });
      toast.success("Administrador creado");
      setNuevo({ username: "", password: "", nivel: "limitado" });
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo crear el administrador");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarNivel = async (admin, nivel) => {
    if (nivel === (admin.nivel || "total")) return;
    const esYo = String(admin._id) === String(yo?.id);
    if (
      !(await confirm({
        title: "Cambiar nivel de acceso",
        message: esYo
          ? `Te vas a cambiar a ti mismo a nivel ${nivel}. Si elegís "limitado", vas a perder el acceso a esta pantalla.`
          : `¿Cambiar a "${admin.username}" al nivel ${nivel}?`,
        confirmText: "Cambiar",
      }))
    )
      return;
    try {
      await API.put(`/auth/admins/${admin._id}`, { nivel });
      toast.success("Nivel actualizado");
      // Si me degradé a mí mismo, el token viejo sigue diciendo "total" hasta que
      // vuelva a entrar: mejor cerrar sesión que dejar la UI mintiendo.
      if (esYo && nivel !== "total") return cerrarSesion();
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo cambiar el nivel");
    }
  };

  const resetearPassword = async (admin) => {
    const pass = window.prompt(
      `Nueva contraseña para "${admin.username}" (mínimo ${MIN_PASS} caracteres).\n\nSe le van a cerrar las sesiones abiertas.`,
    );
    if (pass === null) return;
    if (pass.length < MIN_PASS) {
      return toast.error(`La contraseña tiene que tener al menos ${MIN_PASS} caracteres`);
    }
    try {
      await API.put(`/auth/admins/${admin._id}`, { password: pass });
      toast.success(`Contraseña de "${admin.username}" actualizada`);
      if (String(admin._id) === String(yo?.id)) cerrarSesion();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo cambiar la contraseña");
    }
  };

  const eliminar = async (admin) => {
    if (
      !(await confirm({
        title: "Eliminar administrador",
        message: `¿Eliminar la cuenta de "${admin.username}"? No va a poder entrar más al panel.`,
        confirmText: "Eliminar",
        tone: "danger",
      }))
    )
      return;
    try {
      await API.delete(`/auth/admins/${admin._id}`);
      toast.success("Administrador eliminado");
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo eliminar");
    }
  };

  const cambiarMiPassword = async (e) => {
    e.preventDefault();
    if (miPass.nueva.length < MIN_PASS) {
      return toast.error(`La contraseña nueva tiene que tener al menos ${MIN_PASS} caracteres`);
    }
    if (miPass.nueva !== miPass.repetir) {
      return toast.error("Las dos contraseñas nuevas no coinciden");
    }
    try {
      await API.put("/auth/mi-password", { actual: miPass.actual, nueva: miPass.nueva });
      toast.success("Contraseña cambiada. Entrá de nuevo.");
      setTimeout(cerrarSesion, 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo cambiar la contraseña");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {total ? "Administradores" : "Mi cuenta"}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          {total
            ? "Quién puede entrar al panel y hasta dónde llega cada uno."
            : "Cambiá tu contraseña de acceso al panel."}
        </p>
      </div>

      {/* ── Mi contraseña (todos los niveles) ── */}
      <form onSubmit={cambiarMiPassword} className="bento p-5 space-y-4">
        <h2
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: "var(--text)" }}
        >
          <KeyRound size={16} style={{ color: "var(--brand)" }} />
          Cambiar mi contraseña
          {yo?.username && (
            <span className="font-normal" style={{ color: "var(--muted)" }}>
              ({yo.username})
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña actual"
            className={inputCls}
            style={inputStyle}
            value={miPass.actual}
            onChange={(e) => setMiPass({ ...miPass, actual: e.target.value })}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={`Nueva (mín. ${MIN_PASS})`}
            className={inputCls}
            style={inputStyle}
            value={miPass.nueva}
            onChange={(e) => setMiPass({ ...miPass, nueva: e.target.value })}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Repetir la nueva"
            className={inputCls}
            style={inputStyle}
            value={miPass.repetir}
            onChange={(e) => setMiPass({ ...miPass, repetir: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Al cambiarla se cierra tu sesión y tenés que entrar de nuevo.
          </p>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            Cambiar contraseña
          </button>
        </div>
      </form>

      {!total ? (
        <div className="bento p-5">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tu cuenta tiene <strong style={{ color: "var(--text)" }}>acceso limitado</strong>:
            podés trabajar con productos, pedidos, técnicos, banners, categorías y métricas. La
            importación de Excel, el borrado de productos y la configuración del sitio los maneja
            quien tiene acceso total.
          </p>
        </div>
      ) : (
        <>
          {/* ── Alta ── */}
          <form onSubmit={crear} className="bento p-5 space-y-4">
            <h2
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--text)" }}
            >
              <PlusCircle size={16} style={{ color: "var(--brand)" }} />
              Nuevo administrador
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                autoComplete="off"
                placeholder="Usuario (ej: deposito)"
                className={inputCls}
                style={inputStyle}
                value={nuevo.username}
                onChange={(e) => setNuevo({ ...nuevo, username: e.target.value })}
              />
              <input
                type="text"
                autoComplete="off"
                placeholder={`Contraseña (mín. ${MIN_PASS})`}
                className={inputCls}
                style={inputStyle}
                value={nuevo.password}
                onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
              />
              <select
                className={inputCls}
                style={inputStyle}
                value={nuevo.nivel}
                onChange={(e) => setNuevo({ ...nuevo, nivel: e.target.value })}
              >
                {NIVELES.map((n) => (
                  <option key={n.value} value={n.value}>
                    Acceso {n.label.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {NIVELES.find((n) => n.value === nuevo.nivel)?.ayuda}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Anotá la contraseña antes de crear la cuenta: después no se puede ver, solo
              reemplazar.
            </p>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60"
                style={{ background: "var(--brand)", color: "#fff" }}
              >
                <PlusCircle size={15} /> {guardando ? "Creando…" : "Crear administrador"}
              </button>
            </div>
          </form>

          {/* ── Listado ── */}
          <div className="bento p-5">
            <h2
              className="text-sm font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--text)" }}
            >
              <Users size={16} style={{ color: "var(--brand)" }} />
              Cuentas con acceso al panel
            </h2>

            {cargando ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Cargando administradores…
              </p>
            ) : (
              <div className="space-y-2">
                {admins.map((a) => {
                  const esYo = String(a._id) === String(yo?.id);
                  const nivel = a.nivel || "total";
                  return (
                    <div
                      key={a._id}
                      className="flex items-center justify-between gap-3 flex-wrap py-2.5 px-3 rounded-xl"
                      style={{ background: "var(--surface2)" }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck
                          size={15}
                          style={{ color: nivel === "total" ? "var(--brand)" : "var(--muted)" }}
                        />
                        <span
                          className="font-medium text-sm truncate"
                          style={{ color: "var(--text)" }}
                        >
                          {a.username}
                        </span>
                        {esYo && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                          >
                            vos
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="border rounded-lg px-2 py-1 text-xs outline-none"
                          style={inputStyle}
                          value={nivel}
                          onChange={(e) => cambiarNivel(a, e.target.value)}
                          aria-label={`Nivel de ${a.username}`}
                        >
                          {NIVELES.map((n) => (
                            <option key={n.value} value={n.value}>
                              Acceso {n.label.toLowerCase()}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => resetearPassword(a)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "var(--muted)" }}
                          title="Cambiarle la contraseña"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => eliminar(a)}
                          disabled={esYo}
                          className="p-1.5 rounded-lg disabled:opacity-30"
                          style={{ color: "#DC2626" }}
                          title={esYo ? "No podés eliminar tu propia cuenta" : "Eliminar"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
