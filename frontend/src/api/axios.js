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

// ✅ Interceptor para manejar expiración
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Un service con la sesión vencida terminaba en el login de administración,
      // sin explicación. Cada rol vuelve a su propia pantalla.
      const rol = rolDelToken();
      localStorage.removeItem("token");
      if (rol === "service") {
        localStorage.removeItem("ayp_service_user");
        window.location.href = "/login";
      } else {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
