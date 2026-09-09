import { Navigate } from "react-router-dom";
import { isAdminToken } from "../utils/auth.js";

/**
 * Portón del panel de administración.
 *
 * Antes solo miraba que existiera la clave "token" en localStorage — y como el
 * login de service guarda su token en esa misma clave, un usuario service que
 * escribía /admin en la barra entraba al panel. Ahora exige rol admin leído del
 * JWT firmado. El backend igual valida el rol en cada endpoint (requireAdmin):
 * esto es para que la UI no se muestre, no la única barrera.
 *
 * Lee el token directo y no desde el contexto: AuthProvider está por encima del
 * router, así que no se re-renderiza al navegar y el valor del contexto quedaría
 * viejo justo después del login.
 */
function PrivateRoute({ children }) {
  if (!isAdminToken()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default PrivateRoute;
