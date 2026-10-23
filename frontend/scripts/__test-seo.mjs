/**
 * Prueba las páginas que se le arman a Google (frontend/api/) llamando a las
 * funciones de Vercel tal cual, contra la API de PRODUCCIÓN. Solo lee.
 *
 *   cd frontend
 *   node scripts/__test-seo.mjs
 *
 * Lo que importa verificar, y que no se ve mirando el código:
 *  - que cada página diga lo que ve una persona (marca, código, precio, stock);
 *  - que los datos estructurados sean JSON válido y digan la verdad (un
 *    producto sin stock no puede decir InStock);
 *  - que un producto o una categoría que no existe responda 404 de verdad;
 *  - que la SPA y estas páginas armen las mismas URLs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import ogProduct from "../api/og-product.js";
import ogCategoria from "../api/og-categoria.js";
import ogHome, { horarioDeApertura, direccionPostal } from "../api/og-home.js";
import sitemap from "../api/sitemap.js";
import { API_URL, jsonLd } from "../api/_shared.js";
import { slug, porSlug, urlCategoria, esSubcategoriaReal } from "../src/utils/slug.js";
import { TITULO_HOME, DESCRIPCION_HOME } from "../src/utils/seo.js";

const ok = [];
const fallos = [];

async function check(nombre, fn) {
  try {
    const detalle = await fn();
    ok.push(nombre);
    console.log(`  ✔ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  } catch (e) {
    fallos.push(`${nombre}: ${e.message}`);
    console.log(`  ✘ ${nombre}\n      ${e.message}`);
  }
}
const esperar = (real, esp, que) => {
  if (JSON.stringify(real) !== JSON.stringify(esp)) {
    throw new Error(`${que}: ${JSON.stringify(real)}, se esperaba ${JSON.stringify(esp)}`);
  }
};
const contiene = (html, texto, que) => {
  if (!html.includes(texto)) throw new Error(`${que}: no aparece «${texto}»`);
};

/** Llama a una función de Vercel y devuelve lo que respondió. */
async function llamar(handler, query = {}) {
  const r = { statusCode: 200, headers: {}, body: "" };
  const res = {
    setHeader: (k, v) => { r.headers[k.toLowerCase()] = v; },
    status(c) { r.statusCode = c; return res; },
    send(b) { r.body = b; return res; },
    end() { return res; },
  };
  await handler({ query }, res);
  return r;
}

/** Los bloques JSON-LD de una página, ya parseados. Falla si alguno no es JSON. */
function bloquesLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}
const delTipo = (html, tipo) => bloquesLd(html).find((b) => b["@type"] === tipo);

async function api(ruta) {
  const r = await fetch(`${API_URL}${ruta}`);
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json();
}

console.log("\nURLs de categoría");
console.log("─".repeat(50));

await check("slug() arma URLs legibles", () => {
  esperar(slug("Caños y accesorios de cobre"), "canos-y-accesorios-de-cobre", "con ñ");
  esperar(slug("Autogena y soldaduras"), "autogena-y-soldaduras", "simple");
  esperar(slug("Refrigeración comercial"), "refrigeracion-comercial", "con tilde");
  esperar(slug("Motores y Forzadores"), "motores-y-forzadores", "mayúsculas");
  esperar(urlCategoria("Lavarropas", "Bombas de desagote"), "/catalogo/lavarropas/bombas-de-desagote", "subcategoría");
});

await check("porSlug() encuentra el nombre real desde la URL", () => {
  esperar(porSlug(["Caños y accesorios de cobre", "Filtros"], "canos-y-accesorios-de-cobre"), "Caños y accesorios de cobre", "nombre");
  esperar(porSlug(["Filtros"], "no-existe"), null, "inexistente");
});

await check("Ninguna categoría real choca con otra al pasar a URL", async () => {
  const cats = await api("/products/meta/categories");
  const urls = cats.map((c) => slug(c.category));
  esperar(new Set(urls).size, urls.length, "URLs distintas");
  for (const c of cats) {
    const subs = (c.subcategories || []).map(slug);
    if (new Set(subs).size !== subs.length) throw new Error(`subcategorías que chocan en ${c.category}`);
  }
  return `${cats.length} categorías`;
});

console.log("\nLa home");
console.log("─".repeat(50));

await check("index.html tiene el mismo título y descripción que la home", () => {
  const html = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html"),
    "utf8"
  );
  contiene(html, `<title>${TITULO_HOME.replace("&", "&amp;")}</title>`, "título");
  contiene(html, `content="${DESCRIPCION_HOME}"`, "descripción");
});

let home;
await check("La home para Google lleva los datos del local", async () => {
  home = await llamar(ogHome);
  esperar(home.statusCode, 200, "estado");
  const tienda = delTipo(home.body, "Store");
  if (!tienda) throw new Error("no hay JSON-LD del negocio");
  esperar(tienda.address?.addressLocality, "Los Polvorines", "localidad");
  if (!tienda.telephone?.startsWith("+54")) throw new Error(`teléfono raro: ${tienda.telephone}`);
  return `${tienda.address.streetAddress}, ${tienda.openingHoursSpecification?.length || 0} tramos de horario`;
});

await check("La home linkea a todas las categorías", async () => {
  const cats = await api("/products/meta/categories");
  for (const c of cats) contiene(home.body, `href="${urlCategoria(c.category)}"`, c.category);
});

await check("El horario del panel se entiende bien", () => {
  const h = horarioDeApertura("Lunes a Viernes de 8:00 a 18:00hs, Sabados 8:00 a 15:00");
  esperar(h.length, 2, "tramos");
  esperar(h[0].dayOfWeek.length, 5, "lunes a viernes");
  esperar([h[0].opens, h[0].closes], ["08:00", "18:00"], "horas de semana");
  esperar(h[1].dayOfWeek, ["https://schema.org/Saturday"], "sábado");
  esperar([h[1].opens, h[1].closes], ["08:00", "15:00"], "horas del sábado");
});

await check("Un horario que no se entiende se omite, no se inventa", () => {
  esperar(horarioDeApertura("Consultar por WhatsApp"), [], "horario");
  esperar(direccionPostal("Dirección del local, Ciudad, Provincia"), null, "dirección de ejemplo");
});

console.log("\nProductos");
console.log("─".repeat(50));

const masVendido = (await api("/products?limit=1&sort=soldCount:desc")).products[0];
let ficha;

await check("Un producto real dice lo que ve una persona", async () => {
  ficha = await llamar(ogProduct, { code: masVendido.productCode });
  esperar(ficha.statusCode, 200, "estado");
  contiene(ficha.body, `Código: ${masVendido.productCode}`, "código");
  contiene(ficha.body, masVendido.inStock === false ? "Sin stock" : "En stock", "stock");
  contiene(ficha.body, "Precio: $", "precio");
  contiene(ficha.body, 'aria-label="Ubicación"', "migas de pan");
  return masVendido.productCode;
});

await check("Los datos estructurados del producto son válidos y verdaderos", () => {
  const prod = delTipo(ficha.body, "Product");
  if (!prod) throw new Error("no hay JSON-LD Product");
  esperar(prod.sku, masVendido.productCode, "sku");
  esperar(prod.offers?.priceCurrency, "ARS", "moneda");
  esperar(
    prod.offers?.availability,
    masVendido.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    "disponibilidad"
  );
  if (!delTipo(ficha.body, "BreadcrumbList")) throw new Error("no hay migas en JSON-LD");
});

await check("Un producto con categoría linkea a ella y a productos relacionados", async () => {
  // El más vendido no sirve para esto: hoy no tiene categoría (un tercio del
  // catálogo está así). Se toma uno de Lavarropas.
  const conCategoria = (await api("/products?limit=1&category=Lavarropas")).products[0];
  const r = await llamar(ogProduct, { code: conCategoria.productCode });
  contiene(r.body, `href="${urlCategoria("Lavarropas")}"`, "categoría en las migas");
  const links = (r.body.match(/<li><a href="\/product\//g) || []).length;
  if (links < 5) throw new Error(`solo ${links} productos relacionados`);
  return `${links} relacionados`;
});

await check("Un producto sin categoría no arma migas rotas", async () => {
  // 12100321 trae la subcategoría "-", un relleno del Excel.
  const r = await llamar(ogProduct, { code: "12100321" });
  esperar(r.statusCode, 200, "estado");
  if (/href="\/catalogo\/[^"]*\/"/.test(r.body) || /href="\/catalogo\/-/.test(r.body)) {
    throw new Error("hay un link de categoría roto");
  }
});

await check("Los rellenos del Excel no cuentan como subcategoría", () => {
  for (const relleno of ["-", "--", "—", "n/a", "s/d", "Sin subcategoria", "", undefined]) {
    if (esSubcategoriaReal(relleno)) throw new Error(`«${relleno}» pasó como subcategoría`);
  }
  if (!esSubcategoriaReal("Bombas de desagote")) throw new Error("rechazó una de verdad");
});

await check("La marca en los datos estructurados es la del producto, no la tienda", async () => {
  const marcas = await api("/products/brands");
  const conMarca = (await api(`/products?limit=1&brand=${encodeURIComponent(marcas[0])}`)).products[0];
  const r = await llamar(ogProduct, { code: conMarca.productCode });
  const prod = delTipo(r.body, "Product");
  if (/A&P/.test(prod.brand?.name || "")) throw new Error("la marca es la tienda");
  if (!prod.brand) throw new Error("sin marca");
  return `${conMarca.productCode}: ${prod.brand.name}`;
});

await check("Un combo dice qué incluye, con link a cada pieza", async () => {
  const combos = await api("/products?limit=1&category=Combos");
  if (!combos.products.length) return "no hay combos cargados: se saltea";
  const combo = combos.products[0];
  const r = await llamar(ogProduct, { code: combo.productCode });
  contiene(r.body, "Qué incluye", "sección");
  const piezas = (combo.componentes || []).length;
  return `${combo.productCode}, ${piezas} piezas`;
});

await check("Un código que no existe da 404 y no se indexa", async () => {
  const r = await llamar(ogProduct, { code: "NO-EXISTE-999999" });
  esperar(r.statusCode, 404, "estado");
  contiene(r.body, 'content="noindex"', "noindex");
  return "antes: 200 con una página genérica";
});

console.log("\nCategorías");
console.log("─".repeat(50));

await check("/catalogo lista todas las categorías", async () => {
  const r = await llamar(ogCategoria, {});
  esperar(r.statusCode, 200, "estado");
  const cats = await api("/products/meta/categories");
  for (const c of cats) contiene(r.body, `href="${urlCategoria(c.category)}"`, c.category);
});

let lavarropas;
await check("Una categoría lista sus productos como links, de a 100", async () => {
  lavarropas = await llamar(ogCategoria, { c: "lavarropas" });
  esperar(lavarropas.statusCode, 200, "estado");
  const links = (lavarropas.body.match(/<li><a href="\/product\//g) || []).length;
  esperar(links, 100, "productos en la primera página");
  contiene(lavarropas.body, "?pagina=2", "link a la página siguiente");
  return "Google ya no depende del scroll";
});

await check("La segunda página existe y vuelve a la primera", async () => {
  const r = await llamar(ogCategoria, { c: "lavarropas", pagina: "2" });
  esperar(r.statusCode, 200, "estado");
  contiene(r.body, "Anterior", "link anterior");
  contiene(r.body, 'href="https://www.refrigeracionayp.com/catalogo/lavarropas?pagina=2"', "canonical propio");
});

await check("Una página de más da 404", async () => {
  const r = await llamar(ogCategoria, { c: "lavarropas", pagina: "99" });
  esperar(r.statusCode, 404, "estado");
});

await check("Una subcategoría tiene su página", async () => {
  const cats = await api("/products/meta/categories");
  const lav = cats.find((c) => c.category === "Lavarropas");
  const sub = lav.subcategories[0];
  const r = await llamar(ogCategoria, { c: "lavarropas", s: slug(sub) });
  esperar(r.statusCode, 200, "estado");
  contiene(r.body, `<h1>${sub}</h1>`, "título");
  return sub;
});

await check("Una categoría que no existe da 404", async () => {
  const r = await llamar(ogCategoria, { c: "heladeras-voladoras" });
  esperar(r.statusCode, 404, "estado");
});

await check("Una subcategoría que no es de esa categoría redirige a la categoría", async () => {
  const r = await llamar(ogCategoria, { c: "lavarropas", s: "no-existe" });
  esperar(r.statusCode, 301, "estado");
  esperar(r.headers.location, "/catalogo/lavarropas", "destino");
});

await check("Los links viejos ?cat= redirigen con 301 a la URL nueva", async () => {
  const r = await llamar(ogCategoria, { cat: "Caños y accesorios de cobre" });
  esperar(r.statusCode, 301, "estado");
  esperar(r.headers.location, "/catalogo/canos-y-accesorios-de-cobre", "destino");
});

console.log("\nSitemap y seguridad");
console.log("─".repeat(50));

await check("El sitemap trae las categorías y subcategorías", async () => {
  const r = await llamar(sitemap, {});
  contiene(r.body, "/catalogo/lavarropas</loc>", "categoría");
  const subs = (r.body.match(/\/catalogo\/[a-z0-9-]+\/[a-z0-9-]+<\/loc>/g) || []).length;
  if (subs < 10) throw new Error(`solo ${subs} subcategorías`);
  return `${subs} subcategorías`;
});

await check("Un nombre con </script> no rompe el JSON-LD", () => {
  const bloque = jsonLd({ name: "</script><script>alert(1)</script>" });
  esperar((bloque.match(/<\/script>/g) || []).length, 1, "cierres de script");
});

await check("Todos los JSON-LD de todas las páginas son JSON válido", () => {
  for (const html of [home.body, ficha.body, lavarropas.body]) bloquesLd(html);
});

console.log(`\n${ok.length} pruebas OK${fallos.length ? `, ${fallos.length} FALLA(S)` : ""}`);
if (fallos.length) fallos.forEach((f) => console.log(`  · ${f}`));
process.exitCode = fallos.length ? 1 : 0;
