// Lectura del JWT guardado. Vive fuera de AuthContext a propósito: los guardias
// de ruta necesitan leer el token EN EL MOMENTO del render, no el valor que el
// provider calculó la última vez.
//
// AuthProvider está montado por encima de BrowserRouter (main.jsx), así que un
// navigate() no lo re-renderiza: si PrivateRoute dependiera del valor del
// contexto, después de loguearte leería el estado anterior (sin admin) y te
// rebotaría al login en loop.

const TOKEN_KEY = "token";

/** Payload del JWT guardado, o null si no hay token, está mal formado o venció. */
export function readTokenPayload() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** ¿El token guardado es de un administrador vigente? */
export function isAdminToken() {
  return readTokenPayload()?.role === "admin";
}

/** ¿El token guardado es de un técnico service aprobado? */
export function isApprovedServiceToken() {
  const payload = readTokenPayload();
  return payload?.role === "service" && payload?.approved === true;
}
