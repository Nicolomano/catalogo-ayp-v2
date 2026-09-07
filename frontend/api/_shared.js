// Config compartida por las funciones serverless de Vercel.
// Ojo: las variables VITE_* son de build (cliente); acá corre Node, así que se
// leen de process.env y se deja el fallback al backend de producción.
export const SITE_URL = (process.env.SITE_URL || "https://www.refrigeracionayp.com").replace(/\/$/, "");

// La API vive bajo /api (sin el prefijo responde 404). Lo normalizamos para no
// depender de si la variable en Vercel lo trae o no.
function normalizeApiBase(url) {
  const clean = url.replace(/\/+$/, "");
  return /\/api$/.test(clean) ? clean : `${clean}/api`;
}

export const API_URL = normalizeApiBase(
  process.env.API_URL ||
    process.env.VITE_API_URL ||
    "https://catalogo-ayp-v2-production.up.railway.app/api"
);

/** Escapa texto para meterlo en HTML/XML sin romper el documento. */
export function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** fetch con timeout, para que la función no quede colgada si la API no responde. */
export async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
