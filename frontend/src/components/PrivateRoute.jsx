import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext.jsx";

/**
 * Portón del panel de administración.
 *
 * Antes solo miraba que existiera la clave "token" en localStorage — y como el
 * login de service guarda su token en esa misma clave, un usuario service que
 * escribía /admin en la barra entraba al panel. Ahora exige rol admin leído del
 * JWT firmado. El backend igual valida el rol en cada endpoint (requireAdmin):
 * esto es para que la UI no se muestre, no la única barrera.
 */
function PrivateRoute({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default PrivateRoute;
