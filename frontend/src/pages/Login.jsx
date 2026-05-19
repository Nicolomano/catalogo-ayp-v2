import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../Context/AuthContext";
import toast from "react-hot-toast";

function Login() {
  const { loginService, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

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
    <div className="min-h-[calc(100vh-92px)] flex">

      {/* Panel izquierdo — solo desktop */}
      <div
        className="hidden md:flex flex-col justify-between w-5/12 p-12 relative overflow-hidden"
        style={{ background: "var(--hero-grad)" }}
      >
        <div className="absolute right-0 bottom-0 w-96 h-96 opacity-5 pointer-events-none">
          <svg viewBox="0 0 400 400" fill="none">
            <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="0.5"/>
            <circle cx="200" cy="200" r="120" stroke="white" strokeWidth="0.5"/>
            <circle cx="200" cy="200" r="60" stroke="white" strokeWidth="0.5"/>
            <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth="0.5"/>
            <line x1="200" y1="20" x2="200" y2="380" stroke="white" strokeWidth="0.5"/>
          </svg>
        </div>

        <img src="/logo.png" alt="A&P" className="h-11 w-auto" onError={(e) => { e.target.style.display = "none"; }} />

        <div>
          <h2 className="text-3xl font-black text-white leading-tight mb-3">
            Accedé a precios<br />
            <span style={{ color: "#99BBFF" }}>exclusivos para técnicos</span>
          </h2>
          <p className="text-white/55 text-sm leading-relaxed max-w-xs">
            Con tu cuenta service accedés a 10% de descuento en todos los productos.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {["10% de descuento service", "Cotización directa por WhatsApp", "Acceso completo a todos los productos"].map((feat) => (
            <div key={feat} className="flex items-center gap-2.5 text-sm text-white/65">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#99BBFF" }} />
              {feat}
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-scale-in">
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-5"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            Precio Service
          </span>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Iniciá sesión</h1>
          <p className="text-sm mb-7" style={{ color: "var(--muted)" }}>
            Accedé a precios especiales para técnicos matriculados.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-1"
            >
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            ¿No tenés cuenta?{" "}
            <Link to="/register" style={{ color: "var(--brand)" }} className="font-semibold hover:underline">
              Registrate como service
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
