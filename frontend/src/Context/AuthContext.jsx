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
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "service") localStorage.removeItem(TOKEN_KEY);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setServiceUser(null);
  };

  // True when a service user is logged in and approved
  const isServiceApproved =
    serviceUser?.role === "service" && serviceUser?.approved === true;

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
