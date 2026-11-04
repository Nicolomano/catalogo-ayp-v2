/**
 * Después de un deploy, los archivos de la versión anterior (/assets/Catalogo-abc.js)
 * ya no existen. Quien tenía la página abierta y navega a otra sección pide uno de
 * esos archivos, falla, y antes veía la pantalla de error. La solución es recargar:
 * la página nueva trae los nombres nuevos.
 *
 * Se recarga una sola vez cada 30 segundos. Si el archivo falta por otro motivo,
 * recargar no lo arregla, y sin este freno la página entraría en un bucle.
 */
const CLAVE = "recargaPorDeploy";
const ESPERA_MS = 30_000;

/** Devuelve true si recargó; false si ya lo había intentado hace poco. */
export function recargarPorDeploy() {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE)) || 0;
    if (Date.now() - ultima < ESPERA_MS) return false;
    sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin sessionStorage no hay forma de frenar un bucle: mejor no recargar.
    return false;
  }
  window.location.reload();
  return true;
}

/** ¿Es el error de un archivo de la página que no se pudo bajar? */
export function esErrorDeCarga(error) {
  const msg = String(error?.message || error || "");
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Unable to preload CSS/i.test(msg)
  );
}
