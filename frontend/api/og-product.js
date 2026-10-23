import {
  SITE_URL,
  API_URL,
  escapeXml,
  fetchJson,
  pesos,
  migas,
  pagina,
  enviar,
  paginaNoEncontrada,
  paginaNoDisponible,
  traerCategorias,
  traerNegocio,
} from "./_shared.js";
import { NEGOCIO, presentacionProducto, tieneDescripcionPropia } from "../src/utils/seo.js";
import { urlCategoria, esSubcategoriaReal } from "../src/utils/slug.js";
import { formatTitle } from "../src/utils/text.js";

/**
 * La ficha de un producto, armada en el servidor para los robots.
 *
 * Hace falta porque el sitio es una SPA: el contenido se escribe con JavaScript,
 * y WhatsApp, Facebook y compañía NO lo ejecutan. vercel.json manda acá a esos
 * robots y también a Googlebot; las personas siguen recibiendo la SPA.
 *
 * La regla: esta página dice LO MISMO que ve una persona sin sesión en la ficha
 * —nombre, marca, código, precio de lista, stock, migas de pan, qué incluye si
 * es combo, productos relacionados—. Así es renderizado dinámico, que Google
 * acepta, y no contenido distinto para el robot. Los textos salen de
 * src/utils/seo.js, los mismos que usa la SPA.
 *
 * Antes era un <h1> con el nombre, un <p> con la descripción (que en el 83% de
 * los productos es el nombre otra vez) y un link: Google veía el nombre dos
 * veces y nada más.
 *
 * A propósito NO hay redirect automático a la SPA: esta función responde en la
 * misma URL del producto, y un redirect haría un loop si el filtro de
 * user-agent llegara a matchear a una persona.
 */
export default async function handler(req, res) {
  const code = String(req.query.code || "");
  const ruta = `/product/${encodeURIComponent(code)}`;

  const [categorias, negocio] = await Promise.all([traerCategorias(), traerNegocio()]);

  let p;
  try {
    p = await fetchJson(`${API_URL}/products/code/${encodeURIComponent(code)}`);
  } catch (err) {
    console.error(`og-product: no se pudo traer "${code}" —`, err.message);
    // 404 solo si la API dice que no existe: así un producto borrado sale del
    // índice. Si la API está caída, 503, para que Google vuelva a intentar y no
    // saque productos que existen.
    return err.status === 404
      ? enviar(res, paginaNoEncontrada({ ruta, categorias, negocio, que: "Este producto" }), 404)
      : enviar(res, paginaNoDisponible(ruta), 503);
  }

  const nombre = formatTitle(p.name);
  const presentacion = tieneDescripcionPropia(p) ? p.description.trim() : presentacionProducto(p);
  const imagen = p.image || `${SITE_URL}/og-image.jpg`;
  const enStock = p.inStock !== false;
  const conPrecio = Number(p.priceARS) > 0;

  // Migas: Inicio › Productos › Categoría › Subcategoría, igual que la ficha.
  const cat = p.categories?.[0];
  // La misma regla que la ficha: sin los rellenos del Excel ("-", "n/a").
  const sub = cat && esSubcategoriaReal(p.subcategories?.[0]) ? p.subcategories[0] : null;
  const { html: migasHtml, ld: migasLd } = migas([
    { nombre: "Inicio", url: "/" },
    { nombre: "Productos", url: "/catalogo" },
    ...(cat ? [{ nombre: cat, url: urlCategoria(cat) }] : []),
    ...(sub ? [{ nombre: sub, url: urlCategoria(cat, sub) }] : []),
    { nombre, url: ruta },
  ]);

  // "También te puede interesar": los mismos que muestra la ficha.
  let relacionados = [];
  if (cat) {
    try {
      const r = await fetchJson(
        `${API_URL}/products?category=${encodeURIComponent(cat)}&limit=9&sort=soldCount:desc`
      );
      relacionados = (r?.products || []).filter((x) => x._id !== p._id).slice(0, 8);
    } catch {
      // Sin relacionados la página sigue sirviendo.
    }
  }

  const productoLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nombre,
    description: presentacion,
    image: imagen,
    sku: p.productCode,
    url: `${SITE_URL}${ruta}`,
    // La marca es la del producto (Drean, Tecumseh), no la tienda.
    ...(p.brand ? { brand: { "@type": "Brand", name: formatTitle(p.brand) } } : {}),
    ...(conPrecio
      ? {
          offers: {
            "@type": "Offer",
            // El precio de lista: el mismo que ve cualquier visitante. El
            // precio service nunca sale de la sesión del técnico.
            price: Math.round(Number(p.priceARS)),
            priceCurrency: "ARS",
            availability: enStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `${SITE_URL}${ruta}`,
            seller: { "@type": "Organization", name: NEGOCIO },
          },
        }
      : {}),
  };

  const piezas = p.componentesDetalle?.length
    ? `<section>
        <h2>Qué incluye</h2>
        <ul>${p.componentesDetalle
          .map(
            (c) =>
              `<li>${c.quantity}× <a href="/product/${encodeURIComponent(c.productCode)}">${escapeXml(
                formatTitle(c.name)
              )}</a> (código ${escapeXml(c.productCode)})${c.inStock ? "" : " — sin stock"}</li>`
          )
          .join("")}</ul>
        <p>El precio es la suma de estos productos.</p>
      </section>`
    : "";

  const listaRelacionados = relacionados.length
    ? `<section>
        <h2>También te puede interesar</h2>
        <ul>${relacionados
          .map(
            (r) =>
              `<li><a href="/product/${encodeURIComponent(r.productCode)}">${escapeXml(
                formatTitle(r.name)
              )}</a>${Number(r.priceARS) > 0 ? ` — ${pesos(r.priceARS)}` : ""}</li>`
          )
          .join("")}</ul>
      </section>`
    : "";

  const cuerpo = `
      ${migasHtml}
      <article>
        ${p.image ? `<img src="${escapeXml(p.image)}" alt="${escapeXml(nombre)}" />` : ""}
        <h1>${escapeXml(nombre)}</h1>
        ${p.brand ? `<p>Marca: ${escapeXml(formatTitle(p.brand))}</p>` : ""}
        <p>Código: ${escapeXml(p.productCode)}</p>
        <p>${conPrecio ? `Precio: ${pesos(p.priceARS)}` : "Consultar precio"}</p>
        <p>${enStock ? "En stock" : "Sin stock"}</p>
        <p>${escapeXml(presentacion)}</p>
        ${piezas}
      </article>
      ${listaRelacionados}`;

  const precioOg = conPrecio
    ? `<meta property="product:price:amount" content="${Math.round(Number(p.priceARS))}" />
    <meta property="product:price:currency" content="ARS" />`
    : "";

  const html = pagina({
    titulo: `${nombre} | ${NEGOCIO}`,
    descripcion: presentacion.slice(0, 200),
    ruta,
    imagen,
    tipoOg: "product",
    cabezaExtra: precioOg,
    cuerpo,
    categorias,
    negocio,
    bloquesLd: [productoLd, migasLd],
  });

  enviar(res, html, 200);
}
