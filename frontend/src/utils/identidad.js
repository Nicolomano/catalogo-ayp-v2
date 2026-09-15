// CUIT, CUIL y DNI — copia de la validación del servidor para poder avisar
// mientras el técnico escribe, sin esperar la respuesta.
//
// La versión que manda es Backend/src/utils/identidad.js: esto es comodidad,
// no control. Si se toca una, tocar la otra.
//
// El número de 11 dígitos lleva el DNI adentro:
//   20 - 12345678 - 6   →  prefijo · DNI · dígito verificador (módulo 11)
//
// Toda persona con DNI tiene CUIL aunque nunca se haya inscripto en ARCA, así
// que el campo acepta las dos cosas.

const PREFIJOS = ["20", "23", "24", "27", "30", "33", "34"];
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

export function verificadorOk(valor) {
  const d = soloDigitos(valor);
  if (d.length !== 11) return false;
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(d[i]), 0);
  let v = 11 - (suma % 11);
  if (v === 11) v = 0;
  if (v === 10) v = 9;
  return v === Number(d[10]);
}

/** null si está bien; si no, el texto a mostrarle al usuario. */
export function errorIdentificacion(valor) {
  const d = soloDigitos(valor);
  if (!d) return "Escribí tu CUIT, CUIL o DNI";
  if (d.length === 7 || d.length === 8) return null; // DNI suelto: no tiene verificador
  if (d.length !== 11) {
    return "Escribí tu CUIT o CUIL (11 dígitos) o tu DNI (7 u 8 dígitos)";
  }
  if (!PREFIJOS.includes(d.slice(0, 2))) {
    return "El número tiene que empezar en 20, 23, 24, 27, 30, 33 o 34";
  }
  if (!verificadorOk(d)) {
    return "El CUIT/CUIL no es válido: revisá los números, el último dígito no coincide";
  }
  return null;
}
