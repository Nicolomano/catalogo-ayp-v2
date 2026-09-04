import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookieConsent";

// Banner de cookies dismissible. Guarda la decisión en localStorage para no
// volver a mostrarlo. No bloquea la navegación: es un aviso informativo.
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Si localStorage no está disponible, mostramos el banner igual.
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Ignorar: sin persistencia solo reaparecerá en la próxima visita.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className="pointer-events-auto max-w-3xl mx-auto rounded-2xl border shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        <div className="flex items-start gap-3 flex-1">
          <div
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            <Cookie className="h-5 w-5" />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
            Usamos cookies y tecnologías similares para el funcionamiento del sitio y para
            entender cómo se usa. Al continuar navegando, aceptás su uso. Podés leer más en
            nuestra{" "}
            <Link to="/privacidad" className="font-semibold underline" style={{ color: "var(--brand)" }}>
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Link
            to="/privacidad"
            className="text-sm font-medium px-3 py-2 rounded-xl transition-colors hover:bg-[var(--surface2)]"
            style={{ color: "var(--text2)" }}
          >
            Más info
          </Link>
          <button
            onClick={accept}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-transform hover:scale-[1.02]"
            style={{ background: "var(--brand)" }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
