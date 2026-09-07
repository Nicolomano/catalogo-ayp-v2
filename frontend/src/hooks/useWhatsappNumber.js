import { useEffect, useState } from "react";
import API from "../api/axios";

// El número de WhatsApp lo necesitan el botón del header (mobile) y el FAB (desktop).
// Cacheamos la promesa a nivel módulo para que se pida una sola vez por carga de página.
let cached = null;

function fetchNumber() {
  if (!cached) {
    cached = API.get("/site-config")
      .then((r) => (r.data?.whatsapp || "").replace(/\D/g, ""))
      .catch(() => "");
  }
  return cached;
}

/** Devuelve el número de WhatsApp ya limpio (solo dígitos), o "" si no hay. */
export default function useWhatsappNumber() {
  const [number, setNumber] = useState("");

  useEffect(() => {
    let alive = true;
    fetchNumber().then((n) => {
      if (alive) setNumber(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  return number;
}
