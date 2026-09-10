import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MailCheck } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";

/** Paso 1: pedir el enlace de recuperación por email. */
export default function RecuperarPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      // El backend responde lo mismo exista o no la cuenta, así que la pantalla
      // tampoco puede dar pistas de qué emails están registrados.
      setEnviado(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo enviar el correo. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Helmet>
        <title>Recuperar contraseña | A&P Refrigeración</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      {enviado ? (
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
            Revisá tu correo
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--muted)" }}>
            Si el email corresponde a una cuenta registrada, te enviamos un enlace para crear
            una contraseña nueva. Vence en una hora. Mirá también la carpeta de spam.
          </p>
          <Link to="/login" className="btn-primary text-sm">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            Recuperar contraseña
          </h1>
          <p className="text-sm mb-7" style={{ color: "var(--muted)" }}>
            Ingresá el email de tu cuenta service y te mandamos un enlace para crear una nueva.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: "var(--muted)" }}
              >
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
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
              {loading ? "Enviando…" : "Enviarme el enlace"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            <Link to="/login" style={{ color: "var(--brand)" }} className="font-semibold hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
