import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Eye, EyeOff } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";

const MIN_PASSWORD = 8; // mismo mínimo que valida el backend

/** Paso 2: crear la contraseña nueva con el token que llegó por email. */
export default function RestablecerPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      toast.error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    if (password !== repetir) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await API.post("/auth/reset-password", { token, password });
      toast.success("Contraseña actualizada. Ya podés iniciar sesión.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Helmet>
        <title>Nueva contraseña | A&P Refrigeración</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      {!token ? (
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
            Enlace inválido
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            El enlace está incompleto. Pedí uno nuevo desde la pantalla de recuperación.
          </p>
          <Link to="/recuperar-password" className="btn-primary text-sm">
            Pedir un enlace nuevo
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            Crear contraseña nueva
          </h1>
          <p className="text-sm mb-7" style={{ color: "var(--muted)" }}>
            Elegí una contraseña de al menos {MIN_PASSWORD} caracteres.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Contraseña nueva
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD}
                  placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--muted2)" }}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
                Repetir contraseña
              </label>
              <input
                type={showPass ? "text" : "password"}
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
