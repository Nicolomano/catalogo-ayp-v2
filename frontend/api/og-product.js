import { SITE_URL, API_URL, escapeXml, fetchJson } from "./_shared.js";

/**
 * Meta tags de un producto para los robots que arman la preview del link
 * (WhatsApp, Facebook, Telegram, Google...).
 *
 * Hace falta porque el sitio es una SPA: los tags de react-helmet se escriben
 * con JavaScript y esos robots NO ejecutan JavaScript — solo ven el index.html
 * estático. Sin esto, compartir un producto muestra el logo genérico del sitio
 * en vez de la foto y el nombre del producto.
 *
 * vercel.json enruta acá solo cuando el user-agent es uno de esos robots; las
 * personas siguen recibiendo la SPA normal. Igual va un redirect por las dudas.
 */
export default async function handler(req, res) {
  const code = req.query.code || "";
  const pageUrl = `${SITE_URL}/product/${encodeURIComponent(code)}`;

  let product = null;
  try {
    product = await fetchJson(`${API_URL}/products/code/${encodeURIComponent(code)}`);
  } catch (err) {
    console.error(`og-product: no se pudo traer "${code}" —`, err.message);
  }

  const title = product?.name
    ? `${product.name} | A&P Refrigeración`
    : "A&P Refrigeración";

  const description =
    product?.description?.trim()?.slice(0, 200) ||
    "Repuestos y equipos de refrigeración comercial e industrial. Cotizá por WhatsApp.";

  const image = product?.image || `${SITE_URL}/og-image.jpg`;

  const price =
    product?.priceARS > 0
      ? `<meta property="product:price:amount" content="${product.priceARS}" />
    <meta property="product:price:currency" content="ARS" />`
      : "";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.status(200).send(`<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeXml(title)}</title>
    <meta name="description" content="${escapeXml(description)}" />
    <link rel="canonical" href="${escapeXml(pageUrl)}" />

    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="A&P Refrigeración" />
    <meta property="og:title" content="${escapeXml(title)}" />
    <meta property="og:description" content="${escapeXml(description)}" />
    <meta property="og:image" content="${escapeXml(image)}" />
    <meta property="og:url" content="${escapeXml(pageUrl)}" />
    <meta property="og:locale" content="es_AR" />
    ${price}

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeXml(title)}" />
    <meta name="twitter:description" content="${escapeXml(description)}" />
    <meta name="twitter:image" content="${escapeXml(image)}" />

    <meta http-equiv="refresh" content="0; url=${escapeXml(pageUrl)}" />
  </head>
  <body>
    <h1>${escapeXml(product?.name || "A&P Refrigeración")}</h1>
    <p>${escapeXml(description)}</p>
    <a href="${escapeXml(pageUrl)}">Ver producto</a>
  </body>
</html>`);
}
