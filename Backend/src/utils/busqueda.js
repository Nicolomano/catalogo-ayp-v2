/**
 * Armado del filtro de búsqueda del catálogo.
 *
 * El buscador anterior tomaba lo que escribía el cliente y lo buscaba como
 * subcadena literal, entera y en ese orden. Eso hacía que "rulemanes" no
 * encontrara los 54 rulemanes cargados, y que "tubo de nitrógeno" no encontrara
 * los 5 tubos, que en el catálogo se llaman "TUBO DE NITRO".
 *
 * Acá se resuelven las dos causas que aparecieron al revisar las búsquedas
 * fallidas reales:
 *
 *  1. La gente escribe las palabras sueltas y en otro orden ("bomba vacio",
 *     "plaqueta inverter"). → Se parte en palabras y se exigen todas.
 *  2. El sistema contable ABREVIA los nombres: NITRO por nitrógeno, MOTOC. por
 *     motocompresor, FILCAP por filtro capilar. El cliente escribe la palabra
 *     completa y no encuentra nada. → Reintento acortando, y sinónimos para las
 *     abreviaturas que no son prefijo.
 */

/** Tope de caracteres del término. Un `search` de 15 KB se expande a un patrón
 *  enorme que se aplica a cada documento de la colección. */
export const MAX_SEARCH = 64;

/** Tope de palabras, para no armar un $and de 300 regex. */
const MAX_PALABRAS = 6;

/** Mínimo al que se puede acortar una palabra en el reintento. Por debajo de
 *  esto los falsos positivos se disparan: "tub" trae TUBULAR, TUBERIA y demás. */
const MIN_PREFIJO = 5;

/**
 * Palabras que no aportan a la búsqueda y que, si se exigieran, dejarían afuera
 * resultados válidos: "MANOMETRO NITRO ALTA" no contiene "de", así que buscar
 * "manometro de nitro" no encontraría nada.
 */
const VACIAS = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "y", "o",
  "para", "con", "por", "en", "a", "al", "x",
]);

/**
 * Abreviaturas del sistema contable que NO son prefijo de la palabra completa,
 * así que ningún acortamiento las alcanza: "filcap" no empieza como "filtro".
 *
 * La clave es lo que escribe el cliente; el valor, lo que hay que buscar además.
 *
 * ⚠️ NO agregar capacitor ↔ condensador. Acá "condensador" es el serpentín, no
 * el capacitor eléctrico — hay una categoría con ese nombre. Mezclarlos haría
 * que buscar un condensador devuelva capacitores.
 */
const SINONIMOS = {
  motocompresor: ["motoc"],
  solenoide: ["solen"],
  rodamiento: ["ruleman"],
  ruleman: ["rodamiento"],
  cano: ["tubo"],
  tubo: ["cano"],
  nitrogeno: ["nitro"],
  evaporador: ["evap"],
  termostato: ["termost"],
  resistencia: ["resist"],
  plaqueta: ["placa"],
  placa: ["plaqueta"],
};

/**
 * Sinónimos de VARIAS palabras, que no se pueden resolver palabra por palabra.
 *
 * "filtro capilar" está en el catálogo como "FILCAP": ni "filtro" ni "capilar"
 * aparecen ahí. Exigir las dos palabras no encuentra nada, y reemplazar solo
 * una tampoco, porque la otra sigue sin estar. Por eso se traduce la frase
 * entera a una búsqueda alternativa, y se buscan las dos cosas.
 *
 * La clave se compara contra el término ya normalizado y sin plurales.
 */
const FRASES = {
  "filtro capilar": "filcap",
  "valvula solenoide": "valv solen",
  "tubo nitrogeno": "tubo nitro",
};

/** Quita tildes y pasa a minúscula, para comparar y para cortar palabras. */
export const normalizar = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Escapa lo que en un regex significaría otra cosa. Sin esto, buscar "1/2 hp"
 *  o un nombre con paréntesis podía romper el patrón. */
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Patrón que matchea la palabra con o sin tildes.
 *
 * Se arma sobre la palabra YA normalizada: así "nitrógeno" y "nitrogeno"
 * producen el mismo patrón, y ese patrón encuentra las dos formas en la base.
 */
function patronFlexible(palabra) {
  const map = {
    a: "[aáàâäã]", e: "[eéèêë]", i: "[iíìîï]",
    o: "[oóòôöõ]", u: "[uúùûü]", n: "[nñ]", c: "[cç]",
  };
  return [...palabra].map((c) => map[c] ?? escapar(c)).join("");
}

/** Saca el plural simple del castellano. Solo en palabras largas: "gas" y "mes"
 *  no deben perder la s. */
function singular(palabra) {
  if (palabra.length >= 6 && palabra.endsWith("es")) return palabra.slice(0, -2);
  if (palabra.length >= 5 && palabra.endsWith("s")) return palabra.slice(0, -1);
  return palabra;
}

/**
 * Parte el término en palabras buscables: normalizadas, sin las vacías, sin
 * plural y sin duplicados.
 */
export function palabrasDe(termino) {
  const limpio = normalizar(termino).trim().slice(0, MAX_SEARCH);
  if (!limpio) return [];
  const vistas = new Set();
  const salida = [];
  for (const cruda of limpio.split(/[\s,]+/)) {
    if (!cruda) continue;
    // Las vacías se descartan por su forma original: "las" no debe volverse "la".
    if (VACIAS.has(cruda)) continue;
    const p = singular(cruda);
    if (!p || vistas.has(p)) continue;
    vistas.add(p);
    salida.push(p);
    if (salida.length >= MAX_PALABRAS) break;
  }
  return salida;
}

/** Las formas alternativas de una palabra: ella misma más sus sinónimos. */
function variantes(palabra) {
  const alts = SINONIMOS[palabra] || [];
  return [palabra, ...alts.map(normalizar)];
}

/**
 * Condición de Mongo para UNA palabra: tiene que aparecer en alguno de los
 * campos buscables, en cualquiera de sus formas.
 */
function condicionPalabra(palabra) {
  const patron = variantes(palabra).map(patronFlexible).join("|");
  const regex = { $regex: patron, $options: "i" };
  return {
    $or: [
      { name: regex },
      { productCode: regex },
      { brand: regex },
      { description: regex },
    ],
  };
}

/** El término buscado más las reescrituras de frase que le apliquen. */
function alternativas(termino) {
  const base = palabrasDe(termino).join(" ");
  if (!base) return [];
  const salida = [base];
  for (const [frase, reemplazo] of Object.entries(FRASES)) {
    if (base.includes(frase)) salida.push(base.replace(frase, reemplazo));
  }
  return salida;
}

/**
 * Filtro para el término tal cual se escribió: todas las palabras, en cualquier
 * orden. Si alguna reescritura de frase aplica, se buscan las dos variantes y
 * vale cualquiera. Devuelve null si no quedó ninguna palabra buscable.
 */
export function filtroBusqueda(termino) {
  const variantesTermino = alternativas(termino);
  if (!variantesTermino.length) return null;

  const filtros = variantesTermino.map((t) => ({
    $and: palabrasDe(t).map(condicionPalabra),
  }));
  return filtros.length === 1 ? filtros[0] : { $or: filtros };
}

/**
 * Variantes acortadas de una palabra, de la más larga a la más corta.
 * "nitrogeno" → nitrogen, nitroge, nitrog, nitro
 *
 * Es lo que permite que quien escribe la palabra completa encuentre el producto
 * que el contable cargó abreviado.
 */
function prefijos(palabra) {
  const salida = [];
  for (let n = palabra.length - 1; n >= MIN_PREFIJO; n--) {
    salida.push(palabra.slice(0, n));
  }
  return salida;
}

/**
 * Variantes de la palabra con UN error de tipeo: una letra cambiada, una de
 * más o una de menos. Resuelve "tuvo" por "tubo".
 *
 * Solo para palabras de 4 a 10 letras: más cortas generan demasiadas variantes
 * sin sentido, más largas no suelen escribirse mal enteras.
 */
function conUnError(palabra) {
  if (palabra.length < 4 || palabra.length > 10) return [];
  const letras = "abcdefghijklmnopqrstuvwxyz";
  const salida = new Set();
  for (let i = 0; i < palabra.length; i++) {
    salida.add(palabra.slice(0, i) + palabra.slice(i + 1)); // falta una letra
    for (const l of letras) {
      if (l !== palabra[i]) salida.add(palabra.slice(0, i) + l + palabra.slice(i + 1)); // cambiada
    }
  }
  salida.delete(palabra);
  return [...salida];
}

/**
 * Filtro del reintento, para cuando la búsqueda normal no devolvió nada.
 *
 * Cada palabra puede aparecer acortada o con un error de tipeo. Es más caro que
 * la búsqueda normal, por eso corre SOLO en el camino de cero resultados.
 *
 * Devuelve null si no hay nada que reintentar (palabras muy cortas para acortar
 * y para corregir).
 */
export function filtroReintento(termino) {
  const palabras = palabrasDe(termino);
  if (!palabras.length) return null;

  let algunaCambio = false;
  const condiciones = palabras.map((palabra) => {
    const formas = [...variantes(palabra), ...prefijos(palabra), ...conUnError(palabra)];
    if (formas.length > 1) algunaCambio = true;
    const patron = [...new Set(formas)].map(patronFlexible).join("|");
    const regex = { $regex: patron, $options: "i" };
    return {
      $or: [
        { name: regex },
        { productCode: regex },
        { brand: regex },
        { description: regex },
      ],
    };
  });

  if (!algunaCambio) return null;
  return { $and: condiciones };
}

/**
 * Qué mostrarle al cliente cuando el reintento encontró algo: el término que
 * efectivamente trajo resultados, para poner "te mostramos resultados para X".
 *
 * Se arma con las palabras ya normalizadas y sin las vacías, que es lo que de
 * verdad se buscó.
 */
export function terminoSugerido(termino) {
  return palabrasDe(termino).join(" ");
}
