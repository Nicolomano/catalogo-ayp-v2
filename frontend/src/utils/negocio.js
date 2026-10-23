/**
 * Los datos del local como JSON-LD (schema.org/Store): dirección, teléfono y
 * horario, tal como están cargados en el panel. Es lo que Google usa para
 * relacionar el sitio con el local en las búsquedas "cerca de mí".
 *
 * Va en la home de la SPA (Landing.jsx). No en una página armada para el robot
 * como los productos: Vercel sirve index.html antes de mirar las reglas de
 * vercel.json, así que en "/" Google siempre recibe la SPA (y la ejecuta).
 *
 * Lo que no se puede leer con seguridad se omite en vez de inventarse: un
 * horario o una dirección equivocados en Google son peores que ninguno.
 *
 * Sin JSX ni dependencias: lo prueba frontend/scripts/__test-seo.mjs en Node.
 */
import { NEGOCIO } from "./seo.js";

export function negocioLd(negocio = {}, siteUrl) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: NEGOCIO,
    url: `${siteUrl}/`,
    image: `${siteUrl}/og-image.jpg`,
    logo: `${siteUrl}/logo-mark.png`,
    priceRange: "$$",
    areaServed: "AR",
  };

  const tel = String(negocio.whatsapp || negocio.phone || "").replace(/\D/g, "");
  // Menos de 10 dígitos no es un teléfono argentino completo (el de ejemplo
  // "+54 11 XXXX-XXXX" deja solo "5411").
  if (tel.length >= 10) ld.telephone = `+${tel.startsWith("54") ? tel : `54${tel}`}`;

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
  for (const tramo of normal.split(/[,;]/)) {
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
