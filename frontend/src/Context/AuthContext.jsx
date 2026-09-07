import { createContext, useContext, useState } from "react";
import API from "../api/axios";

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

/** Payload del JWT guardado, o null si no hay token o está mal formado. */
function readTokenPayload() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
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
      return { ok: false, message: msg };
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

  // True when a service user is logged in and approved
  const isServiceApproved =
    serviceUser?.role === "service" && serviceUser?.approved === true;

  // True solo si el JWT dice role "admin" y no está vencido. Antes se infería
  // como "hay token y no hay serviceUser", así que un service que borrara
  // ayp_service_user de localStorage veía el link de Admin en la nav.
  // Es solo cosmético: las rutas admin las protege el backend.
  const adminPayload = readTokenPayload();
  const isAdmin =
    adminPayload?.role === "admin" &&
    (!adminPayload.exp || adminPayload.exp * 1000 > Date.now());

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
