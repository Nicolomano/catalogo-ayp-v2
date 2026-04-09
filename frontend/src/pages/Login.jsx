import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import toast from "react-hot-toast";

const inputCls = "w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

function Login() {
  const { loginService, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await loginService(email, password);
    if (result.ok) {
      toast.success("¡Bienvenido! Accedés a precios especiales.");
      navigate("/catalogo");
    } else if (result.pending) {
      toast("Tu cuenta está pendiente de aprobación. Te avisamos por email.", { icon: "⏳" });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="bento w-full max-w-sm p-8" style={{ borderRadius: "24px" }}>
        {/* Logo / marca */}
        <div className="mb-6 text-center">
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-3"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            Precio Service
          </span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Iniciá sesión</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Accedé a precios especiales para técnicos matriculados.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-colors"
            style={{ background: "var(--brand)" }}
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
          ¿No tenés cuenta?{" "}
          <Link to="/register" style={{ color: "var(--brand)" }} className="font-medium hover:underline">
            Registrate como service
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
