import axios from "axios";

// El fallback apunta a producción a propósito: si VITE_API_URL falta en Vercel,
// hornear localhost dejaría la tienda muerta sin que el build falle.
// En desarrollo la variable la aporta el .env local.
const API = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://catalogo-ayp-v2-production.up.railway.app/api",
});

/** Rol del JWT guardado, para decidir a qué login mandar al usuario. */
function rolDelToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]))?.role || null;
  } catch {
    return null;
  }
}

// ✅ Interceptor para agregar token a cada request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Llamadas donde un 401 significa "los datos están mal", NO "se venció la
 * sesión". La pantalla que las hizo muestra su propio mensaje y nadie tiene que
 * ser expulsado a ningún lado.
 */
const INTENTOS_DE_ACCESO = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/users/register",
];

/**
 * A dónde mandar a alguien cuando la API contesta 401. Exportada para poder
 * probarla: la regla es fácil de romper y el error se ve recién en producción.
 *
 * Devuelve null si no hay que moverlo de donde está.
 *
 * El caso que estuvo roto: un técnico que erraba la contraseña recibía 401, y
 * como TODAVÍA no tenía token, no había rol para leer y caía en el `else` — el
 * login de administración. Se registraba, se equivocaba al tipear y terminaba
 * en el portal de admin sin entender nada.
 */
export function destinoTras401(url = "", rol = null) {
  if (INTENTOS_DE_ACCESO.some((ruta) => url.includes(ruta))) return null;
  // Solo a un administrador se lo manda al login de administración. Cualquier
  // otro —técnico o visitante sin sesión— va al login público.
  return rol === "admin" ? "/admin/login" : "/login";
}

// ✅ Interceptor para manejar expiración
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const destino = destinoTras401(error.config?.url || "", rolDelToken());
      if (destino) {
        localStorage.removeItem("token");
        localStorage.removeItem("ayp_service_user");
        window.location.href = destino;
      }
    }
    return Promise.reject(error);
  }
);
/**
 * GET que se saltea el caché del navegador.
 *
 * Las listas de categorías se sirven con `Cache-Control: public, max-age=300`
 * para aliviar el catálogo público. En el panel eso jugaba en contra: al crear
 * una categoría, el navegador seguía devolviendo la lista vieja hasta 5 minutos,
 * así que la categoría recién creada no aparecía ni en la estructura ni en el
 * desplegable de categoría padre, y parecía que no se había guardado.
 *
 * Usar SOLO en pantallas de administración: en el sitio público el caché es el
 * que hace que el catálogo abra rápido.
 */
export const getFresco = (path, config) =>
  API.get(path + (path.includes("?") ? "&" : "?") + "_=" + Date.now(), config);

/**
 * Descarga un archivo de una ruta protegida.
 *
 * No se puede usar `window.open` ni un `<a href>` común: el token va en el
 * header Authorization y el navegador no lo manda en una navegación. Por eso el
 * "Exportar Excel" de Productos devolvía 401 y abría una pestaña con un error
 * en vez del archivo.
 */
export async function descargarConToken(path, nombreArchivo) {
  const res = await API.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después del click: revocarlo en el mismo tick cancela la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default API;
