import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { options } | null
  const resolverRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Devuelve una promesa que resuelve true (confirmar) o false (cancelar)
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ options: options || {} });
    });
  }, []);

  const close = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setState(null);
  }, []);

  // Esc = cancelar; foco al botón confirmar al abrir
  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 30);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [state, close]);

  const o = state?.options || {};
  const danger = o.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={o.title || "Confirmar acción"}
            className="w-full max-w-sm rounded-2xl p-6 space-y-4 animate-scale-in"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {o.title && (
                <h3 className="font-bold text-base" style={{ color: "var(--text)" }}>
                  {o.title}
                </h3>
              )}
              {o.message && (
                <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                  {o.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                {o.cancelText || "Cancelar"}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2"
                style={{ background: danger ? "#DC2626" : "var(--brand)" }}
              >
                {o.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
