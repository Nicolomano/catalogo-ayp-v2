import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Helmet>
        <title>Página no encontrada | A&P Refrigeración</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <p className="text-6xl font-black mb-3" style={{ color: "var(--brand)", opacity: 0.25 }}>
        404
      </p>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        No encontramos esta página
      </h1>
      <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--muted)" }}>
        Puede que el link esté mal escrito o que el producto ya no esté disponible.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/catalogo" className="btn-primary text-sm">
          <Search className="h-4 w-4" /> Ver productos
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl font-semibold text-sm border transition-colors hover:bg-[var(--surface2)]"
          style={{ color: "var(--text)", borderColor: "var(--border)", minHeight: "44px" }}
        >
          <Home className="h-4 w-4" /> Ir al inicio
        </Link>
      </div>
    </div>
  );
}
