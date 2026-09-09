import { createContext, useContext, useState } from "react";
import API from "../api/axios";
import { readTokenPayload, isAdminToken, isApprovedServiceToken } from "../utils/auth.js";

const AuthContext = createContext();

// Token key used by the admin login as well
const TOKEN_KEY = "token";
const SERVICE_USER_KEY = "ayp_service_user";

function loadServiceUser() {
  try {
    const raw = localStorage.getItem(SERVICE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Service user state (stored separately from the admin token)
  const [serviceUser, setServiceUser] = useState(() => loadServiceUser());
  const [loading, setLoading] = useState(false);

  /**
   * Login for service users via /auth/login.
   * Returns { ok, message }
   */
  const loginService = async (email, password) => {
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { email, password });
      const { token, role, approved, name } = res.data;

      if (role !== "service") {
        return { ok: false, message: "Esta pantalla es solo para usuarios service." };
      }

      if (!approved) {
        return {
          ok: false,
          message:
            "Tu cuenta aún no fue aprobada. Por favor esperá la confirmación del administrador.",
          pending: true,
        };
      }

      // Store token and user info
      localStorage.setItem(TOKEN_KEY, token);
      const userData = { email, name, role, approved };
      localStorage.setItem(SERVICE_USER_KEY, JSON.stringify(userData));
      setServiceUser(userData);
      return { ok: true };
    } catch (err) {
      const msg = err.response?.data?.message || "Error al iniciar sesión";
      // El backend ahora rechaza con 403 las cuentas sin aprobar (antes devolvía
      // un token igual y el bloqueo era solo de pantalla).
      return { ok: false, message: msg, pending: err.response?.data?.pending === true };
    } finally {
      setLoading(false);
    }
  };

  const logoutService = () => {
    localStorage.removeItem(SERVICE_USER_KEY);
    // Only remove token if it doesn't belong to an admin session
    if (localStorage.getItem(TOKEN_KEY)) {
      const payload = readTokenPayload();
      if (!payload || payload.role === "service") localStorage.removeItem(TOKEN_KEY);
    }
    setServiceUser(null);
  };

  // Ambos roles se derivan del JWT, no de localStorage: el token está firmado y
  // no se puede falsificar desde la consola. Antes `isServiceApproved` salía de
  // un objeto plano de localStorage, así que cualquiera se activaba el precio
  // service escribiendo una línea en la consola; y ahora que el descuento se
  // aplica de verdad en el backend, el precio que se muestra tiene que salir de
  // la misma fuente que el que se cotiza, o vuelven a no coincidir.
  const isAdmin = isAdminToken();
  const isServiceApproved = isApprovedServiceToken();

  // Computes 10% off price for approved service users
  const servicePrice = (priceARS) => {
    if (!isServiceApproved || !priceARS) return null;
    return Math.round(priceARS * 0.9);
  };

  return (
    <AuthContext.Provider
      value={{
        serviceUser,
        loading,
        loginService,
        logoutService,
        isServiceApproved,
        isAdmin,
        servicePrice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
