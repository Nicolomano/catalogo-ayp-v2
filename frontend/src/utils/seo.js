/**
 * Títulos y descripciones para buscadores.
 *
 * Los usan la SPA (react-helmet) Y las páginas que se le arman a Google en el
 * servidor (frontend/api/). Tienen que salir del mismo lugar: la regla para que
 * Google acepte una página armada para el robot es que diga lo mismo que ve una
 * persona.
 *
 * Sin JSX ni dependencias: tiene que poder correr en Node tal cual.
 */
import { formatTitle } from "./text.js";

export const NEGOCIO = "A&P Refrigeración";

/** Dónde está el local. Es lo que la gente agrega a la búsqueda ("... en zona norte"). */
export const ZONA = "Los Polvorines";

export const TITULO_HOME = `Repuestos de refrigeración en ${ZONA} | ${NEGOCIO}`;

// Corta a propósito: Google muestra unos 155 caracteres y corta el resto.
export const DESCRIPCION_HOME =
  `Repuestos de refrigeración en ${ZONA}, zona norte del GBA: motocompresores, ` +
  "gas, caños de cobre, plaquetas y más. Envíos a todo el país.";

// Cada página pública declara los suyos. Kit y Contacto no lo hacían y heredaban
// los de index.html, que son los de la home: Google las marcó como "duplicada,
// sin versión canónica" de la home.
export const TITULO_KIT = `Kit de instalación de aire acondicionado | ${NEGOCIO}`;

export const DESCRIPCION_KIT =
  "Calculá los materiales para instalar un split: caño de cobre, aislante, ménsulas, " +
  "tacos, cable y manguera. Elegí las medidas y armá el pedido con el total al instante.";

export const TITULO_CONTACTO = `Contacto | ${NEGOCIO}`;

export const DESCRIPCION_CONTACTO =
  `Encontranos en ${ZONA}, zona norte del GBA. Consultá por productos, precios o envíos ` +
  "por WhatsApp o teléfono.";

export const TITULO_CATALOGO = `Productos | ${NEGOCIO}`;

export const DESCRIPCION_CATALOGO =
  "Todos los repuestos de refrigeración comercial, industrial y de línea blanca. " +
  `Envíos a todo el país desde ${ZONA}.`;

/** ¿La descripción del producto dice algo más que el nombre? */
export function tieneDescripcionPropia(p) {
  const d = (p?.description || "").trim().toLowerCase();
  return Boolean(d) && d !== (p?.name || "").trim().toLowerCase();
}

/**
 * Un texto de presentación armado con los datos del producto.
 *
 * En el 83% de los productos la descripción que trae el Excel es igual al
 * nombre: la ficha mostraba el nombre dos veces, y Google veía una página que
 * no decía nada más. Esto se muestra en esos casos, en la ficha y en la página
 * para Google por igual.
 *
 * Sin precio a propósito: un técnico ve el precio service en la ficha, y un
 * texto con el de lista al lado lo contradiría.
 */
export function presentacionProducto(p) {
  if (!p) return "";
  const nombre = formatTitle(p.name);
  const marca = p.brand?.trim();
  const marcaYaEnElNombre = marca && nombre.toLowerCase().includes(marca.toLowerCase());
  const partes = [
    marca && !marcaYaEnElNombre ? `${nombre}, marca ${formatTitle(marca)}.` : `${nombre}.`,
    `Código ${p.productCode}.`,
  ];
  if (p.componentesDetalle?.length) {
    partes.push(`Combo de ${p.componentesDetalle.length} productos: el precio es la suma de sus piezas.`);
  }
  partes.push(p.inStock === false ? "Sin stock por el momento." : "En stock.");
  partes.push(`Envíos a todo el país desde ${ZONA}. Consultá por WhatsApp.`);
  return partes.join(" ");
}

/** "Lavarropas | A&P Refrigeración" o "Bombas · Lavarropas | A&P Refrigeración" */
export function tituloCategoria(categoria, subcategoria) {
  const base = subcategoria ? `${subcategoria} · ${categoria}` : categoria;
  return `${base} | ${NEGOCIO}`;
}

/**
 * La descripción de una categoría, armada con sus subcategorías.
 *
 * Neutra a propósito ("Herramientas: pinzas, ..."), porque una plantilla tipo
 * "repuestos para X" queda mal en la mitad de las categorías.
 */
export function descripcionCategoria(categoria, subcategorias = [], subcategoria) {
  if (subcategoria) {
    return (
      `${subcategoria} (${categoria}) en ${NEGOCIO}. ` +
      `Envíos a todo el país desde ${ZONA}. Cotizá por WhatsApp.`
    );
  }
  const subs = [...subcategorias].sort((a, b) => a.localeCompare(b)).slice(0, 6);
  const lista = subs.length ? `: ${subs.join(", ")}${subcategorias.length > 6 ? " y más" : ""}.` : ".";
  return `${categoria}${lista} Comprá en ${NEGOCIO}, con envíos a todo el país desde ${ZONA}.`;
}
