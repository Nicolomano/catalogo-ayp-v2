import {
  SITE_URL,
  API_URL,
  escapeXml,
  fetchJson,
  pesos,
  pagina,
  enviar,
  traerCategorias,
  traerNegocio,
} from "./_shared.js";
import { NEGOCIO, ZONA, TITULO_HOME, DESCRIPCION_HOME } from "../src/utils/seo.js";
import { urlCategoria } from "../src/utils/slug.js";
import { formatTitle } from "../src/utils/text.js";

/**
 * La home armada en el servidor para los robots.
 *
 * Además de los links a todas las categorías y a los destacados (lo mismo que
 * ve una persona), lleva los datos del negocio como JSON-LD: dirección,
 * teléfono y horario, tal como están cargados en el panel. Es lo que Google usa
 * para relacionar el sitio con el local en las búsquedas "cerca de mí".
 */
export default async function handler(req, res) {
  const [categorias, negocio] = await Promise.all([traerCategorias(), traerNegocio()]);

  let destacados = [];
  try {
    const r = await fetchJson(`${API_URL}/products/landing`);
    destacados = Array.isArray(r?.featured) ? r.featured : [];
  } catch {
    // La home sirve igual sin destacados.
  }

  const elegidas = Array.isArray(negocio.featuredCategories) ? negocio.featuredCategories : [];

  const cuerpo = `
      <h1>Repuestos de refrigeración en ${escapeXml(ZONA)}</h1>
      <p>${escapeXml(DESCRIPCION_HOME)}</p>
      ${
        destacados.length
          ? `<section><h2>Destacados</h2><ul>${destacados
              .map(
                (p) =>
                  `<li><a href="/product/${encodeURIComponent(p.productCode)}">${escapeXml(formatTitle(p.name))}</a>` +
                  `${Number(p.priceARS) > 0 ? ` — ${pesos(p.priceARS)}` : ""}</li>`
              )
              .join("")}</ul></section>`
          : ""
      }
      ${
        elegidas.length
          ? `<section><h2>Explorá por rubro</h2><ul>${elegidas
              .map((c) => `<li><a href="${escapeXml(urlCategoria(c))}">${escapeXml(c)}</a></li>`)
              .join("")}</ul></section>`
          : ""
      }
      <section>
        <h2>Kit de instalación</h2>
        <p><a href="/kit-instalacion">Calculá todo lo que necesitás para una instalación completa</a></p>
      </section>`;

  enviar(
    res,
    pagina({
      titulo: TITULO_HOME,
      descripcion: DESCRIPCION_HOME,
      ruta: "/",
      cuerpo,
      categorias,
      negocio,
      bloquesLd: [negocioLd(negocio)],
    })
  );
}

/**
 * Los datos del local como JSON-LD (schema.org/Store).
 *
 * Todo sale del panel. Lo que no se puede leer con seguridad se omite en vez de
 * inventarse: un horario o una dirección equivocados en Google son peores que
 * ninguno.
 */
export function negocioLd(negocio) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: NEGOCIO,
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og-image.jpg`,
    logo: `${SITE_URL}/logo-mark.png`,
    priceRange: "$$",
    areaServed: "AR",
  };

  const tel = String(negocio.whatsapp || negocio.phone || "").replace(/\D/g, "");
  if (tel) ld.telephone = `+${tel.startsWith("54") ? tel : `54${tel}`}`;

  const direccion = direccionPostal(negocio.address);
  if (direccion) ld.address = direccion;

  const horario = horarioDeApertura(negocio.hours);
  if (horario.length) ld.openingHoursSpecification = horario;

  if (negocio.mapsUrl) ld.hasMap = negocio.mapsUrl;

  return ld;
}

/**
 * "Av. del Sesquicentenario 2144, Los Polvorines, Buenos Aires" → PostalAddress.
 * Si no tiene al menos calle y localidad separadas por coma, no se arma.
 */
export function direccionPostal(texto) {
  const partes = String(texto || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (partes.length < 2 || /direcci[oó]n del local/i.test(texto)) return null;
  return {
    "@type": "PostalAddress",
    streetAddress: partes[0],
    addressLocality: partes[1],
    ...(partes[2] ? { addressRegion: partes[2] } : {}),
    addressCountry: "AR",
  };
}

const DIAS = {
  lunes: "Monday",
  martes: "Tuesday",
  miercoles: "Wednesday",
  jueves: "Thursday",
  viernes: "Friday",
  sabado: "Saturday",
  domingo: "Sunday",
};
const ORDEN = Object.keys(DIAS);

/**
 * "Lunes a Viernes de 8:00 a 18:00hs, Sabados 8:00 a 15:00" → horario.
 *
 * Entiende rangos de días ("lunes a viernes") y días sueltos ("sábados"), cada
 * uno con su "H:MM a H:MM". Si una parte no se entiende, se omite esa parte.
 */
export function horarioDeApertura(texto) {
  const normal = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const salida = [];
  for (const tramo of normal.split(/[,;]|\by\b(?=\s+(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo))/)) {
    const horas = tramo.match(/(\d{1,2})(?::(\d{2}))?\s*(?:hs)?\s*a\s*(\d{1,2})(?::(\d{2}))?/);
    if (!horas) continue;
    const dias = ORDEN.filter((d) => new RegExp(`\\b${d}s?\\b`).test(tramo));
    if (!dias.length) continue;
    let incluidos = dias;
    // "lunes a viernes": todos los del medio.
    if (dias.length === 2 && new RegExp(`${dias[0]}s?\\s+a\\s+${dias[1]}`).test(tramo)) {
      incluidos = ORDEN.slice(ORDEN.indexOf(dias[0]), ORDEN.indexOf(dias[1]) + 1);
    }
    const hhmm = (h, m) => `${String(h).padStart(2, "0")}:${m || "00"}`;
    salida.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: incluidos.map((d) => `https://schema.org/${DIAS[d]}`),
      opens: hhmm(horas[1], horas[2]),
      closes: hhmm(horas[3], horas[4]),
    });
  }
  return salida;
}
