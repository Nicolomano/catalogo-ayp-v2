import { SITE_URL, API_URL, escapeXml, fetchJson } from "./_shared.js";

// Páginas fijas del sitio. El admin y el carrito no van (no aportan a la búsqueda).
const STATIC_ROUTES = [
  { path: "/",                 priority: "1.0", changefreq: "weekly"  },
  { path: "/catalogo",         priority: "0.9", changefreq: "daily"   },
  { path: "/kit-instalacion",  priority: "0.7", changefreq: "monthly" },
  { path: "/contacto",         priority: "0.6", changefreq: "monthly" },
  { path: "/privacidad",       priority: "0.2", changefreq: "yearly"  },
];

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  const entries = STATIC_ROUTES.map((r) =>
    urlEntry({ loc: `${SITE_URL}${r.path}`, changefreq: r.changefreq, priority: r.priority })
  );

  // Si la API falla igual devolvemos el sitemap con las páginas fijas:
  // es preferible a responder un 500 que Google interprete como sitemap roto.
  try {
    const products = await fetchJson(`${API_URL}/products/sitemap`, { timeoutMs: 12000 });
    for (const p of products) {
      entries.push(
        urlEntry({
          loc: `${SITE_URL}/product/${encodeURIComponent(p.productCode)}`,
          lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : null,
          changefreq: "weekly",
          priority: "0.8",
        })
      );
    }
  } catch (err) {
    console.error("sitemap: no se pudieron traer los productos —", err.message);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.status(200).send(xml);
}
