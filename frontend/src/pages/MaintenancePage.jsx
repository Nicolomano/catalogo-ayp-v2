import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Logo */}
      <div className="mb-10">
        <img
          src="/logo.png"
          alt="A&P Refrigeración"
          className="h-20 w-auto mx-auto invert dark:invert-0 opacity-90"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      </div>

      {/* Ícono animado */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
        style={{ background: "var(--brand-tint)" }}
      >
        <Snowflake
          className="w-10 h-10"
          style={{ color: "var(--brand)" }}
        />
      </div>

      {/* Texto */}
      <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: "var(--text)" }}>
        Estamos preparando algo grande
      </h1>
      <p className="text-base max-w-md mb-3" style={{ color: "var(--muted)" }}>
        La tienda de <strong style={{ color: "var(--text)" }}>A&P Refrigeración</strong> estará disponible muy pronto.
        Estamos cargando todos nuestros productos para darte la mejor experiencia.
      </p>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Para consultas escribinos por{" "}
        <a
          href="https://wa.me/5491168815837"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
          style={{ color: "var(--brand)" }}
        >
          WhatsApp
        </a>
      </p>

      {/* Link admin (discreto) */}
      <Link
        to="/admin/login"
        className="mt-16 text-xs opacity-30 hover:opacity-60 transition-opacity"
        style={{ color: "var(--muted)" }}
      >
        Acceso administrador
      </Link>
    </div>
  );
}
