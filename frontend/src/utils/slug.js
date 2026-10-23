/**
 * URLs de categoría: /catalogo/lavarropas y /catalogo/lavarropas/bombas.
 *
 * Este archivo lo importan la SPA (las rutas del catálogo) Y las funciones de
 * Vercel que arman las páginas para Google (frontend/api/). Tiene que ser uno
 * solo: si generaran URLs distintas, Google indexaría una dirección y las
 * personas llegarían a otra.
 *
 * Sale del NOMBRE de la categoría y no del slug cargado en el panel, porque
 * varios de esos no sirven para una URL: "aut/sold" tiene una barra,
 * "cañaccobre" una ñ, y "AA" o "AccBronz" no dicen nada. Como el panel no
 * permite renombrar categorías, la URL no cambia.
 *
 * Sin JSX ni dependencias: tiene que poder correr en Node tal cual.
 */

/** "Caños y accesorios de cobre" → "canos-y-accesorios-de-cobre" */
export function slug(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * ¿Es una subcategoría de verdad, o un relleno del Excel?
 *
 * El Excel trae "-", "n/a" y similares en la columna de subcategoría. El
 * backend ya los descarta al listar categorías (PLACEHOLDER_SUBCATS en
 * productsController.js), pero quedan guardados en los productos: sin esto, las
 * migas de pan de la ficha armaban un link a "/catalogo/lavarropas/".
 */
const RELLENOS = new Set(["", "n-a", "s-d", "sin-subcategoria"]);
export function esSubcategoriaReal(nombre) {
  return typeof nombre === "string" && !RELLENOS.has(slug(nombre));
}

/** El nombre de la lista cuyo slug es `s`, o null. */
export function porSlug(nombres, s) {
  if (!s) return null;
  const buscado = slug(s);
  return (nombres || []).find((n) => slug(n) === buscado) || null;
}

/** La URL de una categoría, o de una subcategoría dentro de ella. */
export function urlCategoria(categoria, subcategoria) {
  if (!categoria || categoria === "all") return "/catalogo";
  const base = `/catalogo/${slug(categoria)}`;
  return subcategoria && subcategoria !== "all" ? `${base}/${slug(subcategoria)}` : base;
}
