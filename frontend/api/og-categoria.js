import {
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
import {
  TITULO_CATALOGO,
  DESCRIPCION_CATALOGO,
  tituloCategoria,
  descripcionCategoria,
} from "../src/utils/seo.js";
import { slug, porSlug, urlCategoria } from "../src/utils/slug.js";
import { formatTitle } from "../src/utils/text.js";

/** Productos por página de la lista. Lavarropas tiene ~420: son 5 páginas. */
const POR_PAGINA = 100;

/**
 * El catálogo y sus categorías, armados en el servidor para los robots:
 *   /catalogo                      → todas las categorías
 *   /catalogo/lavarropas           → los productos de Lavarropas
 *   /catalogo/lavarropas/bombas    → los de esa subcategoría
 *
 * Para una persona el catálogo muestra 24 productos y carga más al scrollear.
 * Google NO scrollea: sin esta página, solo veía los primeros 24 de cada
 * categoría, y el resto del catálogo solo era alcanzable por el sitemap. Acá
 * van TODOS, como links, de a 100 por página.
 *
 * Mismo contenido que ve una persona (los mismos productos y precios de lista);
 * títulos y descripciones de src/utils/seo.js, los mismos que usa la SPA.
 *
 * vercel.json pasa la categoría en `c` y la subcategoría en `s` (slugs). El
 * nombre `cat` queda libre para reconocer los links viejos /catalogo?cat=...
 */
export default async function handler(req, res) {
  const { c, s, cat: vieja, sub: viejaSub } = req.query;
  const pagNum = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);

  // Links viejos (/catalogo?cat=Lavarropas): 301 a la URL nueva, para que
  // Google pase lo que tenía de la vieja a la nueva y no las tenga duplicadas.
  if (vieja && !c) {
    res.setHeader("Location", urlCategoria(String(vieja), viejaSub ? String(viejaSub) : null));
    res.setHeader("Cache-Control", "public, s-maxage=86400");
    return res.status(301).end();
  }

  const [categorias, negocio] = await Promise.all([traerCategorias(), traerNegocio()]);

  // Sin categorías no se puede saber si la URL existe: la API no responde.
  if (!categorias.length) {
    return enviar(res, paginaNoDisponible(c ? urlCategoria(c, s) : "/catalogo"), 503);
  }

  // ── /catalogo: todas las categorías ──────────────────────────────
  if (!c) {
    const { html: migasHtml, ld: migasLd } = migas([
      { nombre: "Inicio", url: "/" },
      { nombre: "Productos", url: "/catalogo" },
    ]);
    const lista = categorias
      .map(
        (cat) => `<li>
          <a href="${escapeXml(urlCategoria(cat.category))}">${escapeXml(cat.category)}</a>
          ${
            cat.subcategories?.length
              ? `<ul>${[...cat.subcategories]
                  .sort((a, b) => a.localeCompare(b))
                  .map(
                    (sb) =>
                      `<li><a href="${escapeXml(urlCategoria(cat.category, sb))}">${escapeXml(sb)}</a></li>`
                  )
                  .join("")}</ul>`
              : ""
          }
        </li>`
      )
      .join("");
    return enviar(
      res,
      pagina({
        titulo: TITULO_CATALOGO,
        descripcion: DESCRIPCION_CATALOGO,
        ruta: "/catalogo",
        cuerpo: `${migasHtml}<h1>Productos</h1><p>${escapeXml(DESCRIPCION_CATALOGO)}</p><ul>${lista}</ul>`,
        categorias,
        negocio,
        bloquesLd: [migasLd],
      })
    );
  }

  // ── /catalogo/:cat y /catalogo/:cat/:sub ─────────────────────────
  const elegida = categorias.find((x) => slug(x.category) === slug(c));
  if (!elegida) {
    return enviar(
      res,
      paginaNoEncontrada({ ruta: urlCategoria(c), categorias, negocio, que: "Esta categoría" }),
      404
    );
  }
  const subcategoria = s ? porSlug(elegida.subcategories, s) : null;
  // Una subcategoría que no es de esta categoría: a la categoría, que es lo
  // mismo que hace la SPA (la resuelve como "todas").
  if (s && !subcategoria) {
    res.setHeader("Location", urlCategoria(elegida.category));
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(301).end();
  }

  const qs = new URLSearchParams({
    category: elegida.category,
    limit: String(POR_PAGINA),
    page: String(pagNum),
    sort: "soldCount:desc",
  });
  if (subcategoria) qs.set("subcategory", subcategoria);

  let datos;
  try {
    datos = await fetchJson(`${API_URL}/products?${qs.toString()}`, { timeoutMs: 12000 });
  } catch (err) {
    console.error(`og-categoria: no se pudieron traer los productos de "${elegida.category}" —`, err.message);
    return enviar(res, paginaNoDisponible(urlCategoria(elegida.category, subcategoria)), 503);
  }

  const total = datos?.total || 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const base = urlCategoria(elegida.category, subcategoria);
  // Una página de más (?pagina=99): no existe.
  if (pagNum > paginas) {
    return enviar(res, paginaNoEncontrada({ ruta: base, categorias, negocio }), 404);
  }
  // Cada página de la lista es canónica de sí misma, como recomienda Google
  // para listas paginadas: si todas apuntaran a la primera, los productos de
  // las otras quedarían sin camino.
  const ruta = pagNum > 1 ? `${base}?pagina=${pagNum}` : base;

  const { html: migasHtml, ld: migasLd } = migas([
    { nombre: "Inicio", url: "/" },
    { nombre: "Productos", url: "/catalogo" },
    { nombre: elegida.category, url: urlCategoria(elegida.category) },
    ...(subcategoria ? [{ nombre: subcategoria, url: base }] : []),
  ]);

  const descripcion = descripcionCategoria(elegida.category, elegida.subcategories || [], subcategoria);
  const titulo = tituloCategoria(elegida.category, subcategoria) + (pagNum > 1 ? ` — página ${pagNum}` : "");

  const subLinks =
    !subcategoria && elegida.subcategories?.length
      ? `<nav><h2>Subcategorías</h2><ul>${[...elegida.subcategories]
          .sort((a, b) => a.localeCompare(b))
          .map((sb) => `<li><a href="${escapeXml(urlCategoria(elegida.category, sb))}">${escapeXml(sb)}</a></li>`)
          .join("")}</ul></nav>`
      : "";

  const productos = (datos?.products || [])
    .map(
      (p) =>
        `<li><a href="/product/${encodeURIComponent(p.productCode)}">${escapeXml(formatTitle(p.name))}</a>` +
        `${Number(p.priceARS) > 0 ? ` — ${pesos(p.priceARS)}` : ""}${p.inStock === false ? " (sin stock)" : ""}</li>`
    )
    .join("");

  const paginado =
    paginas > 1
      ? `<nav aria-label="Páginas">${[
          pagNum > 1 ? `<a href="${escapeXml(pagNum === 2 ? base : `${base}?pagina=${pagNum - 1}`)}">Anterior</a>` : "",
          `<span>Página ${pagNum} de ${paginas}</span>`,
          pagNum < paginas ? `<a href="${escapeXml(`${base}?pagina=${pagNum + 1}`)}">Siguiente</a>` : "",
        ].join(" ")}</nav>`
      : "";

  const cuerpo = `
      ${migasHtml}
      <h1>${escapeXml(subcategoria || elegida.category)}</h1>
      <p>${escapeXml(descripcion)}</p>
      <p>${total} productos</p>
      ${subLinks}
      <ul>${productos}</ul>
      ${paginado}`;

  enviar(
    res,
    pagina({
      titulo,
      descripcion,
      ruta,
      cuerpo,
      categorias,
      negocio,
      bloquesLd: [migasLd],
    })
  );
}
