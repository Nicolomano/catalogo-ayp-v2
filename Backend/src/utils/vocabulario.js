/**
 * Las palabras que de verdad aparecen en el catálogo.
 *
 * Sirve para corregir lo que escribe el cliente hacia algo que existe, en vez de
 * inventar variantes. La diferencia importa: el corrector anterior transformaba
 * "jabon" en "labon" —que no es una palabra— y "labon" aparece dentro de
 * "ESLABON de lujo", así que devolvía diez productos sin ninguna relación.
 *
 * Con el vocabulario, "jabon" no se parece a nada del catálogo y la búsqueda
 * devuelve vacío, que es la respuesta correcta.
 *
 * Son unas 3000 palabras, así que entra holgado en memoria y recorrerlas entero
 * para corregir un término tarda milisegundos.
 */
import productModel from "../services/models/productModel.js";
import { normalizar } from "./busqueda.js";

/** Palabras de menos de 4 letras no se corrigen: a esa longitud, casi cualquier
 *  cosa está a un error de casi cualquier otra. */
export const MIN_PALABRA = 4;

/** Cada cuánto se rearma. La importación de Excel es lo único que agrega
 *  palabras nuevas y pasa pocas veces por semana. */
const VIGENCIA_MS = 10 * 60 * 1000;

let cache = null;        // Map<palabra, cantidad de productos>
let armadoEn = 0;
let armando = null;      // promesa en vuelo, para no armarlo dos veces a la vez

async function armar() {
  const docs = await productModel.find({ active: true }).select("name brand").lean();
  const mapa = new Map();
  for (const p of docs) {
    for (const w of normalizar(`${p.name || ""} ${p.brand || ""}`).split(/[^a-z0-9]+/)) {
      // Los números sueltos (medidas, modelos) no se corrigen: cambiarle un
      // dígito a "6203" da "6204", que es otro ruleman distinto.
      if (w.length < MIN_PALABRA || /^\d+$/.test(w)) continue;
      mapa.set(w, (mapa.get(w) || 0) + 1);
    }
  }
  return mapa;
}

/**
 * El vocabulario, armándolo si hace falta.
 *
 * Si falla la consulta devuelve un mapa vacío en vez de romper: sin vocabulario
 * la búsqueda pierde la corrección, pero sigue funcionando.
 */
export async function vocabulario() {
  if (cache && Date.now() - armadoEn < VIGENCIA_MS) return cache;
  if (armando) return armando;

  armando = armar()
    .then((mapa) => {
      cache = mapa;
      armadoEn = Date.now();
      return mapa;
    })
    .catch((e) => {
      console.error("No se pudo armar el vocabulario del catálogo:", e.message);
      return cache || new Map();
    })
    .finally(() => {
      armando = null;
    });

  return armando;
}

/** Para las pruebas: olvidar lo cacheado. */
export function olvidarVocabulario() {
  cache = null;
  armadoEn = 0;
}

/**
 * Distancia de Damerau-Levenshtein, con corte temprano.
 *
 * Cuenta como UN error el cambio, el agregado, el borrado y la transposición de
 * dos letras seguidas. La transposición hace falta de verdad: "drena" por
 * "drean" es el error más común al tipear rápido, y sin ella son dos errores.
 *
 * Devuelve `tope + 1` apenas se sabe que no va a entrar, para no calcular toda
 * la matriz contra las 3000 palabras.
 */
export function distancia(a, b, tope) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > tope) return tope + 1;

  let anterior2 = [];
  let anterior = [];
  let actual = [];
  for (let j = 0; j <= b.length; j++) anterior[j] = j;

  for (let i = 1; i <= a.length; i++) {
    actual = [i];
    let mejorDeLaFila = i;
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(actual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, anterior2[j - 2] + 1);
      }
      actual[j] = v;
      if (v < mejorDeLaFila) mejorDeLaFila = v;
    }
    // Ninguna celda de esta fila entra en el tope: las siguientes tampoco.
    if (mejorDeLaFila > tope) return tope + 1;
    anterior2 = anterior;
    anterior = actual;
  }
  return anterior[b.length];
}

/** Cuántos errores se le toleran a una palabra según su largo. */
const topePara = (palabra) => (palabra.length <= 5 ? 1 : 2);

/**
 * Palabras del catálogo que se parecen a la escrita, de la más parecida a la
 * menos, y a igual parecido primero la que está en más productos.
 *
 * Devuelve [] cuando no hay nada parecido — que es justamente lo que tiene que
 * pasar con "jabon" en un catálogo de refrigeración.
 */
export function corregirPalabra(palabra, vocab, cuantas = 3) {
  if (!vocab?.size || palabra.length < MIN_PALABRA) return [];
  if (vocab.has(palabra)) return [palabra];

  const tope = topePara(palabra);
  const cerca = [];
  let mejor = tope + 1;
  for (const [w, uso] of vocab) {
    const d = distancia(palabra, w, tope);
    if (d > tope) continue;
    if (d < mejor) mejor = d;
    cerca.push({ w, d, uso });
  }
  // Solo las que están a la MISMA distancia que la mejor. "lokring" está a un
  // error de "lockring" y a dos de "oring": traer las dos sería ensuciar el
  // resultado con algo que ya se sabe que es peor.
  return cerca
    .filter((c) => c.d === mejor)
    .sort((x, y) => y.uso - x.uso)
    .slice(0, cuantas)
    .map((c) => c.w);
}

/**
 * Cuántas letras se le pueden sacar como máximo a una palabra.
 *
 * Las abreviaturas del contable recortan poco: válvula → Valv (3 letras),
 * nitrógeno → NITRO (4), termostato → TERMOST (3). Sin este tope, buscar
 * "capacitor" aceptaría el prefijo "capa" si esa fuera una palabra del
 * catálogo, y entonces traería todo lo que diga "capa" o "capacidad".
 * Las abreviaturas más brutales (evaporador → EVAP) van en el diccionario de
 * sinónimos de busqueda.js, que es explícito y no adivina.
 */
const MAX_RECORTE = 4;

/**
 * Prefijos de la palabra que SON palabras del catálogo, del más largo al más
 * corto.
 *
 * Resuelve los nombres abreviados por el sistema contable: el cliente escribe
 * "valvula" y el producto dice "Valv.de seguridad"; escribe "nitrogeno" y el
 * producto dice "TUBO DE NITRO".
 *
 * Exigir que el prefijo exista en el catálogo es lo que permite bajar hasta 4
 * letras sin traer ruido: "valv" está, "jabo" no.
 */
export function prefijosDelCatalogo(palabra, vocab, cuantos = 2) {
  if (!vocab?.size) return [];
  const corto = Math.max(MIN_PALABRA, palabra.length - MAX_RECORTE);
  const salida = [];
  for (let n = palabra.length - 1; n >= corto && salida.length < cuantos; n--) {
    const p = palabra.slice(0, n);
    if (vocab.has(p)) salida.push(p);
  }
  return salida;
}
