/**
 * CUIT, CUIL y DNI.
 *
 * Toda persona con DNI tiene CUIL —lo asigna ANSES, no ARCA— así que un técnico
 * que nunca se inscribió igual tiene un número válido de 11 dígitos. Por eso el
 * formulario acepta las dos cosas: no tener CUIT no es no tener número.
 *
 * El número de 11 dígitos lleva el DNI adentro:
 *
 *     20 - 12345678 - 6
 *     ▲       ▲        ▲
 *     │       │        └─ dígito verificador (módulo 11)
 *     │       └────────── el DNI, tal cual
 *     └────────────────── 20/23/24 varón · 27/23/24 mujer · 30/33/34 empresas
 *
 * Con eso alcanza para descartar lo inventado sin consultarle nada a ARCA:
 * antes entraba cualquier cosa de 11 dígitos, 11111111111 incluido.
 */

const PREFIJOS_PERSONA = ["20", "23", "24", "27"];
const PREFIJOS_EMPRESA = ["30", "33", "34"];
const PREFIJOS = [...PREFIJOS_PERSONA, ...PREFIJOS_EMPRESA];

/** Pesos del módulo 11, en el orden de los primeros 10 dígitos. */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

/** ¿El dígito verificador cierra? Es la misma cuenta que hace ARCA. */
export function verificadorOk(valor) {
  const d = soloDigitos(valor);
  if (d.length !== 11) return false;
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(d[i]), 0);
  let v = 11 - (suma % 11);
  if (v === 11) v = 0;
  if (v === 10) v = 9;
  return v === Number(d[10]);
}

/** El DNI que lleva adentro un CUIT/CUIL de persona. "" para los de empresa. */
export function dniDeCuit(valor) {
  const d = soloDigitos(valor);
  if (d.length !== 11 || !PREFIJOS_PERSONA.includes(d.slice(0, 2))) return "";
  return String(Number(d.slice(2, 10))); // sin ceros a la izquierda
}

/**
 * Interpreta lo que cargó el usuario en un solo campo.
 *
 * Devuelve { ok, motivo, tipo, cuit, dni }. Cuando viene un CUIT/CUIL de persona
 * se completan los dos campos: el DNI sale del propio número, no hay que pedirlo
 * aparte.
 */
export function interpretarIdentificacion(valor) {
  const d = soloDigitos(valor);

  if (!d) return { ok: false, motivo: "El CUIT, CUIL o DNI es requerido" };

  if (d.length === 11) {
    if (!PREFIJOS.includes(d.slice(0, 2))) {
      return {
        ok: false,
        motivo: `El número tiene que empezar en ${PREFIJOS.join(", ")}. Revisá los primeros dos dígitos.`,
      };
    }
    if (!verificadorOk(d)) {
      return {
        ok: false,
        motivo: "El CUIT/CUIL no es válido: el último dígito no coincide. Revisalo antes de enviar.",
      };
    }
    return { ok: true, tipo: "cuit", cuit: d, dni: dniDeCuit(d) };
  }

  if (d.length === 7 || d.length === 8) {
    // Un DNI suelto no tiene forma de validarse solo: no lleva verificador. Se
    // acepta, y el panel avisa que quedó sin CUIT/CUIL.
    return { ok: true, tipo: "dni", cuit: "", dni: String(Number(d)) };
  }

  return {
    ok: false,
    motivo: "Escribí tu CUIT o CUIL (11 dígitos) o tu DNI (7 u 8 dígitos).",
  };
}

/**
 * Revisa un registro ya guardado y devuelve el aviso a mostrar en el panel, o
 * null si está todo bien. No bloquea nada: quien aprueba decide.
 */
export function avisoIdentificacion({ cuit, dni } = {}) {
  const c = soloDigitos(cuit);
  const d = soloDigitos(dni);

  if (!c && !d) return "No cargó CUIT, CUIL ni DNI.";
  if (!c) return "Cargó solo el DNI: no tiene CUIT/CUIL para facturar.";
  if (c.length !== 11 || !PREFIJOS.includes(c.slice(0, 2)) || !verificadorOk(c)) {
    return "El CUIT/CUIL no pasa la validación: puede estar mal tipeado o ser inventado.";
  }
  if (d && dniDeCuit(c) && dniDeCuit(c) !== String(Number(d))) {
    return `El DNI (${Number(d)}) no coincide con el que lleva adentro el CUIT (${dniDeCuit(c)}).`;
  }
  return null;
}
