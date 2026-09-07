import { useEffect, useState, useRef } from "react";
import useWhatsappNumber from "../hooks/useWhatsappNumber.js";
import WhatsappIcon from "./WhatsappIcon.jsx";

/**
 * Botón flotante de WhatsApp — solo desktop.
 * En mobile pisaba steppers y textos, así que ahí el acceso vive en el header.
 * Se esconde al scrollear hacia abajo y reaparece al subir, para no tapar contenido.
 */
export default function WhatsappFloat() {
  const number = useWhatsappNumber();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    lastY.current = window.scrollY;
    const handler = () => {
      const y = window.scrollY;
      // Umbral chico para que el rebote del scroll no lo haga parpadear.
      if (Math.abs(y - lastY.current) < 8) return;
      setHidden(y > lastY.current && y > 120);
      lastY.current = y;
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar por WhatsApp"
      className={`hidden md:flex fixed right-6 bottom-6 z-50 items-center justify-center w-12 h-12 rounded-full text-white transition-all duration-300 hover:scale-110 active:scale-95 group ${
        hidden ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      }`}
      style={{ background: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.4)" }}
    >
      <span
        className="absolute right-14 whitespace-nowrap text-sm font-semibold text-white px-3 py-1.5 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0"
        style={{ background: "#25D366", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
      >
        Consultar por WhatsApp
      </span>

      <WhatsappIcon size={24} />

      <span className="absolute inset-0 rounded-full wa-pulse" style={{ background: "#25D366" }} />
    </a>
  );
}
