import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://catalogo-ayp-v2-production.up.railway.app/api";

const SID_KEY = "ayp_sid";

/**
 * Identificador de la visita. Va en sessionStorage, no en una cookie ni en
 * localStorage: muere al cerrar la pestaña, así que sirve para contar visitas
 * pero no para seguir a nadie entre una visita y la siguiente.
 */
function sesionId() {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).slice(0, 36);
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return null; // navegación privada con el almacenamiento bloqueado
  }
}

/** De dónde llegó la persona, normalizado. Nunca se manda la URL completa,
 *  que puede traer parámetros con datos personales. */
function canalDeOrigen() {
  try {
    const ref = document.referrer;
    if (!ref) return "directo";
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === window.location.hostname.replace(/^www\./, "")) return null; // navegación interna
    if (/google\./.test(host)) return "google";
    if (/bing\./.test(host)) return "bing";
    if (/(whatsapp|wa\.me)/.test(host)) return "whatsapp";
    if (/instagram/.test(host)) return "instagram";
    if (/facebook|fb\./.test(host)) return "facebook";
    return host.slice(0, 40);
  } catch {
    return "directo";
  }
}

/**
 * Registra cada cambio de página contra nuestro propio servidor.
 *
 * Se hace del lado servidor porque los bloqueadores de publicidad tapan Google
 * Analytics para una parte de los visitantes; esto no lo bloquean.
 */
export default function useRegistrarVisita() {
  const location = useLocation();
  const primeraVez = useRef(true);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/admin")) return; // el panel no es una visita del público

    const sid = sesionId();
    if (!sid) return;

    // El canal solo tiene sentido en la primera página de la sesión: después el
    // referrer es el propio sitio.
    const canal = primeraVez.current ? canalDeOrigen() || "directo" : "interno";
    primeraVez.current = false;

    const cuerpo = JSON.stringify({ path, canal, sid });
    const url = `${API_URL}/metrics/view`;

    try {
      // fetch con keepalive y no sendBeacon: un beacon con Content-Type JSON
      // dispara un preflight de CORS que sendBeacon no sabe resolver, así que el
      // dato se perdería en silencio. keepalive sobrevive igual a que la persona
      // cambie de página en el medio.
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // La telemetría nunca puede romper la navegación.
    }
  }, [location.pathname]);
}
