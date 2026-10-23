/**
 * Armado del filtro de búsqueda del catálogo.
 *
 * El buscador anterior tomaba lo que escribía el cliente y lo buscaba como
 * subcadena literal, entera y en ese orden. Eso hacía que "rulemanes" no
 * encontrara los 54 rulemanes cargados, y que "tubo de nitrógeno" no encontrara
 * los 5 tubos, que en el catálogo se llaman "TUBO DE NITRO".
 *
 * Acá se resuelven las tres causas que aparecieron al revisar las búsquedas
 * fallidas reales:
 *
 *  1. La gente escribe las palabras sueltas y en otro orden ("bomba vacio",
 *     "plaqueta inverter"). → Se parte en palabras y se exigen todas.
 *  2. El sistema contable ABREVIA los nombres: NITRO por nitrógeno, MOTOC. por
 *     motocompresor, FILCAP por filtro capilar. El cliente escribe la palabra
 *     completa y no encuentra nada. → Se aceptan los prefijos que son palabras
 *     del catálogo, y hay sinónimos para las abreviaturas que no son prefijo.
 *  3. Los técnicos escriben mal los nombres: "lokring" por lockring, "tecunse"
 *     por tecumseh. → Si no hubo resultados, se corrige cada palabra hacia la
 *     más parecida de las que de verdad están en el catálogo (ver
 *     utils/vocabulario.js), y se le dice al cliente qué se corrigió.
 */

import { corregirPalabra, prefijosDelCatalogo, MIN_PALABRA } from "./vocabulario.js";

/** Tope de caracteres del término. Un `search` de 15 KB se expande a un patrón
 *  enorme que se aplica a cada documento de la colección. */
export const MAX_SEARCH = 64;

/** Tope de palabras, para no armar un $and de 300 regex. */
const MAX_PALABRAS = 6;

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
  // Marcas que están escritas de las dos formas en el catálogo. Hay un script
  // que corrige los nombres en la base (scripts/corregirMarcas.mjs), pero esto
  // queda igual como red de seguridad: el próximo Excel puede traer un producto
  // nuevo mal escrito.
  whirlpool: ["whirpool"],
  whirpool: ["whirlpool"],
  tecumseh: ["tecumshe"],
  tecumshe: ["tecumseh"],
  kohinoor: ["kohinor"],
  kohinor: ["kohinoor"],
  danfoss: ["danfos"],
  danfos: ["danfoss"],
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

/**
 * Las formas en las que una palabra puede estar escrita en el catálogo:
 *
 *  - ella misma;
 *  - sus sinónimos del diccionario de arriba;
 *  - sus prefijos que SON palabras del catálogo: el cliente escribe "valvula" y
 *    el producto se llama "Valv.de seguridad BITZER".
 *
 * Los prefijos se aplican SIEMPRE, no solo cuando la búsqueda no encontró nada.
 * Si no, "válvula de seguridad" no encontraría nunca ese producto: el problema
 * no es que falten las dos palabras, es que una está abreviada, así que la
 * búsqueda normal da cero y el reintento tampoco tiene nada que corregir
 * ("valvula" está bien escrita).
 */
function variantes(palabra, vocab) {
  const alts = (SINONIMOS[palabra] || []).map(normalizar);
  return [palabra, ...alts, ...prefijosDelCatalogo(palabra, vocab)];
}

/**
 * Condición de Mongo para un grupo de formas: alguna de ellas tiene que
 * aparecer en alguno de los campos buscables.
 */
function condicionDeFormas(formas) {
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
 *
 * `vocab` es opcional: sin él se pierden los prefijos del catálogo, pero la
 * búsqueda sigue funcionando.
 */
export function filtroBusqueda(termino, vocab) {
  const variantesTermino = alternativas(termino);
  if (!variantesTermino.length) return null;

  const filtros = variantesTermino.map((t) => ({
    $and: palabrasDe(t).map((p) => condicionDeFormas(variantes(p, vocab))),
  }));
  return filtros.length === 1 ? filtros[0] : { $or: filtros };
}

/**
 * Reintento para cuando la búsqueda normal no devolvió nada: corrige cada
 * palabra hacia las palabras que de verdad están en el catálogo.
 *
 * Devuelve `{ filtro, correccion }`, donde `correccion` es el término corregido
 * para poder decirle al cliente "no encontramos «lokring», te mostramos
 * resultados para lockring".
 *
 * Devuelve null cuando no hay nada que reintentar, y eso incluye el caso
 * importante: si alguna palabra no se parece a NINGUNA del catálogo, no se
 * reintenta nada. Antes se inventaban variantes con una letra cambiada, y
 * "jabon" se convertía en "labon", que está dentro de "ESLABON de lujo": diez
 * productos sin relación. Cero resultados es la respuesta correcta.
 */
export function filtroReintento(termino, vocab) {
  const palabras = palabrasDe(termino);
  if (!palabras.length || !vocab?.size) return null;

  let algunaCambio = false;
  const corregidas = [];
  for (const palabra of palabras) {
    const opciones = corregirPalabra(palabra, vocab);
    if (opciones.length) {
      if (opciones[0] !== palabra) algunaCambio = true;
      corregidas.push(opciones);
      continue;
    }
    // Las palabras muy cortas no se corrigen —a tres letras todo se parece a
    // todo— pero se dejan como están, porque igual pueden caer dentro de un
    // nombre: "nex" está dentro de "DREAN NEXT".
    if (palabra.length < MIN_PALABRA) {
      corregidas.push([palabra]);
      continue;
    }
    return null;
  }
  if (!algunaCambio) return null;

  return {
    filtro: {
      $and: corregidas.map((opciones) =>
        condicionDeFormas(opciones.flatMap((o) => variantes(o, vocab)))
      ),
    },
    correccion: corregidas.map((opciones) => opciones[0]).join(" "),
  };
}
