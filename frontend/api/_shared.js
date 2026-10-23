// Config compartida por las funciones serverless de Vercel.
// Ojo: las variables VITE_* son de build (cliente); acá corre Node, así que se
// leen de process.env y se deja el fallback al backend de producción.
import { NEGOCIO } from "../src/utils/seo.js";
import { urlCategoria } from "../src/utils/slug.js";

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

/**
 * fetch con timeout, para que la función no quede colgada si la API no responde.
 *
 * El error lleva `status`: un 404 de la API (el producto no existe) y una API
 * caída se tienen que contestar distinto. Si se respondiera 404 cuando Railway
 * está caído, Google sacaría del índice productos que existen.
 */
export async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`${res.status} ${res.statusText}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** "$12.500" */
export const pesos = (n) => `$${Math.round(Number(n)).toLocaleString("es-AR")}`;

/**
 * Bloque JSON-LD.
 *
 * `<` se escapa: un nombre de producto con "</script>" cerraría el bloque y lo
 * que sigue se interpretaría como HTML.
 */
export function jsonLd(obj) {
  const json = JSON.stringify(obj).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

/** Las categorías con sus subcategorías, igual que el costado del catálogo. */
export async function traerCategorias() {
  try {
    const data = await fetchJson(`${API_URL}/products/meta/categories`);
    return (Array.isArray(data) ? data : [])
      .map((c) => (typeof c === "string" ? { category: c, subcategories: [] } : c))
      .filter((c) => c?.category);
  } catch (err) {
    console.error("No se pudieron traer las categorías —", err.message);
    return [];
  }
}

/** Dirección, teléfono, horario y WhatsApp: lo que está cargado en el panel. */
export async function traerNegocio() {
  try {
    return (await fetchJson(`${API_URL}/site-config`)) || {};
  } catch (err) {
    console.error("No se pudo traer la configuración del sitio —", err.message);
    return {};
  }
}

/**
 * Migas de pan: el HTML visible y el JSON-LD BreadcrumbList, a partir de la
 * misma lista para que nunca digan cosas distintas.
 *
 * @param {Array<{nombre: string, url: string}>} pasos
 */
export function migas(pasos) {
  const html = `<nav aria-label="Ubicación">${pasos
    .map((p) => `<a href="${escapeXml(p.url)}">${escapeXml(p.nombre)}</a>`)
    .join(" › ")}</nav>`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      item: `${SITE_URL}${p.url}`,
    })),
  };
  return { html, ld };
}

/**
 * La página entera que recibe un robot.
 *
 * Cabecera y pie con links a las secciones y a todas las categorías: es lo que
 * le da a Google caminos para recorrer el catálogo desde cualquier página.
 */
export function pagina({
  titulo,
  descripcion,
  ruta,
  imagen = `${SITE_URL}/og-image.jpg`,
  tipoOg = "website",
  cabezaExtra = "",
  cuerpo,
  categorias = [],
  negocio = {},
  bloquesLd = [],
}) {
  const canonical = `${SITE_URL}${ruta}`;
  const linksCategorias = categorias.length
    ? `<section><h2>Categorías</h2><ul>${categorias
        .map((c) => `<li><a href="${escapeXml(urlCategoria(c.category))}">${escapeXml(c.category)}</a></li>`)
        .join("")}</ul></section>`
    : "";
  const contacto = [
    negocio.address && `<p>${escapeXml(negocio.address)}</p>`,
    negocio.phone && `<p>Teléfono: ${escapeXml(negocio.phone)}</p>`,
    negocio.hours && `<p>Horario: ${escapeXml(negocio.hours)}</p>`,
    negocio.whatsapp &&
      `<p><a href="https://wa.me/${escapeXml(String(negocio.whatsapp).replace(/\D/g, ""))}">Consultar por WhatsApp</a></p>`,
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeXml(titulo)}</title>
    <meta name="description" content="${escapeXml(descripcion)}" />
    <link rel="canonical" href="${escapeXml(canonical)}" />
    <meta property="og:type" content="${escapeXml(tipoOg)}" />
    <meta property="og:site_name" content="${escapeXml(NEGOCIO)}" />
    <meta property="og:title" content="${escapeXml(titulo)}" />
    <meta property="og:description" content="${escapeXml(descripcion)}" />
    <meta property="og:image" content="${escapeXml(imagen)}" />
    <meta property="og:url" content="${escapeXml(canonical)}" />
    <meta property="og:locale" content="es_AR" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeXml(titulo)}" />
    <meta name="twitter:description" content="${escapeXml(descripcion)}" />
    <meta name="twitter:image" content="${escapeXml(imagen)}" />
    ${cabezaExtra}
    ${bloquesLd.map(jsonLd).join("\n    ")}
  </head>
  <body>
    <header>
      <a href="/">${escapeXml(NEGOCIO)}</a>
      <nav>
        <a href="/catalogo">Productos</a>
        <a href="/kit-instalacion">Kit de instalación</a>
        <a href="/contacto">Contacto</a>
      </nav>
    </header>
    <main>
${cuerpo}
    </main>
    <footer>
      ${linksCategorias}
      <section><h2>${escapeXml(NEGOCIO)}</h2>${contacto}</section>
    </footer>
  </body>
</html>`;
}

/** Manda la página con el estado y el cacheo que corresponden. */
export function enviar(res, html, status = 200) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Un error NO se cachea en el CDN: si la API estuvo caída un minuto, Google
  // seguiría recibiendo el error durante una hora.
  res.setHeader(
    "Cache-Control",
    status === 200 ? "public, max-age=300, s-maxage=3600" : status === 404 ? "public, s-maxage=600" : "no-store"
  );
  if (status === 503) res.setHeader("Retry-After", "300");
  res.status(status).send(html);
}

/** Página de "no está", con links para seguir: se responde con 404 de verdad. */
export function paginaNoEncontrada({ ruta, categorias, negocio, que = "Esta página" }) {
  return pagina({
    titulo: `No encontrado | ${NEGOCIO}`,
    descripcion: `${que} ya no está disponible.`,
    ruta,
    cabezaExtra: '<meta name="robots" content="noindex" />',
    cuerpo: `<h1>${escapeXml(que)} ya no está disponible</h1><p><a href="/catalogo">Ver todos los productos</a></p>`,
    categorias,
    negocio,
  });
}

/** Para cuando la API no responde: 503 para que Google vuelva a intentar. */
export function paginaNoDisponible(ruta) {
  return pagina({
    titulo: NEGOCIO,
    descripcion: "Volvé a intentar en unos minutos.",
    ruta,
    cabezaExtra: '<meta name="robots" content="noindex" />',
    cuerpo: "<h1>Volvé a intentar en unos minutos</h1>",
  });
}
