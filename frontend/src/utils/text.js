// Palabras que en castellano van en minúscula dentro de un título
// (salvo que arranquen la frase).
const CONNECTORS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u",
  "a", "al", "en", "con", "para", "por", "sin", "un", "una",
]);

// Unidades y siglas técnicas que se escriben en mayúscula aunque el nombre
// entero venga en mayúscula desde el Excel.
const KEEP_UPPER = new Set([
  "KG", "GR", "HP", "CV", "BTU", "PSI", "MM", "CM", "MT", "MTS", "ML", "LT",
  "LED", "PVC", "ABS", "AC", "DC", "TN", "UV", "RPM", "VDC", "VAC", "IP", "USB",
]);

const UPPER_RE = /^[A-ZÁÉÍÓÚÜÑ]{2,6}$/;

function lettersOf(token) {
  return token.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
}

function capitalize(token) {
  // Sube la primera letra esté donde esté: "(chico)" → "(Chico)"
  return token
    .toLocaleLowerCase("es-AR")
    .replace(/\p{L}/u, (c) => c.toLocaleUpperCase("es-AR"));
}

/**
 * Normaliza el nombre de un producto para mostrarlo: pasa a Title Case pero
 * respeta los códigos de modelo, que en MAYÚSCULA son parte de la identidad
 * del producto ("Manómetro Digital VRM2-X", no "Manómetro Digital Vrm2-x").
 *
 * Ojo con los nombres que vienen 100% en mayúscula (lo normal en el Excel):
 * ahí "2-6 mayúsculas seguidas" no alcanza para detectar una sigla, porque
 * TODAS las palabras cortas la cumplen ("VALVULA DE SERVICIO" → "DE"). En ese
 * caso solo valen los tokens con dígitos y la lista de unidades conocidas.
 *
 * Solo se usa al renderizar: los datos en la base quedan como los trajo el Excel.
 */
export function formatTitle(raw) {
  if (!raw) return "";

  const clean = String(raw)
    .replace(/\s+/g, " ")
    .trim()
    // Puntos suspensivos colgando del import de Excel: "Válvula de servicio..."
    .replace(/(\.{2,}|…)\s*$/, "")
    .trim();

  const allCaps = !/\p{Ll}/u.test(clean);

  return clean
    .split(" ")
    .map((token, i) => {
      const lower = token.toLocaleLowerCase("es-AR");
      if (i > 0 && CONNECTORS.has(lower)) return lower;

      // Código de modelo: cualquier token con dígitos (EVP70, R134, 1/4)
      if (/\d/.test(token)) return token;

      const letters = lettersOf(token);
      if (KEEP_UPPER.has(letters.toUpperCase()) && letters === letters.toUpperCase()) {
        return token;
      }
      // Sigla (SDS, LED): solo confiable si el nombre no viene todo en mayúscula
      if (!allCaps && UPPER_RE.test(letters)) return token;

      return capitalize(token);
    })
    .join(" ");
}
