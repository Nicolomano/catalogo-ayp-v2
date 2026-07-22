import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import API from "../api/axios";
import Logo from "../components/Logo.jsx";

function AdminLogin({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", { username: email, password });
      localStorage.setItem("token", res.data.token);
      onLogin?.(res.data.user);
      navigate("/admin/dashboard");
    } catch {
      setError("Credenciales inválidas. Verificá tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--hero-grad)" }}
    >
      {/* Decoración SVG de fondo */}
      <div className="absolute right-0 bottom-0 w-[520px] h-[520px] opacity-5 pointer-events-none">
        <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="0.5"/>
          <circle cx="200" cy="200" r="130" stroke="white" strokeWidth="0.5"/>
          <circle cx="200" cy="200" r="80" stroke="white" strokeWidth="0.5"/>
          <circle cx="200" cy="200" r="30" stroke="white" strokeWidth="0.5"/>
          <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth="0.5"/>
          <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="0.5"/>
          <line x1="73" y1="73" x2="327" y2="327" stroke="white" strokeWidth="0.5"/>
          <line x1="327" y1="73" x2="73" y2="327" stroke="white" strokeWidth="0.5"/>
        </svg>
      </div>

      <div className="w-full max-w-sm animate-scale-in relative z-10">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Lock className="h-6 w-6 text-white" />
          </div>
          <Logo height={36} color="#fff" className="mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Panel de administración</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>A&P Refrigeración</p>
        </div>

        {/* Card del formulario */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "var(--surface)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.2)",
          }}
        >
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted2)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@empresa.com"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "var(--muted2)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="input-field pl-9 pr-10"
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-2"
            >
              {loading ? "Verificando…" : "Acceder al panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.25)" }}>
          Acceso restringido · A&P Refrigeración
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
