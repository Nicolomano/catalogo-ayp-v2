import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import MaintenancePage from "./pages/MaintenancePage.jsx";
import API from "./api/axios.js";
import { isAdminToken, esAdminTotal } from "./utils/auth.js";

// ── Páginas públicas (lazy: cada una en su chunk, no viajan en el primer load) ──
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Catalogo = lazy(() => import("./pages/Catalogo.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Contacto = lazy(() => import("./pages/Contacto.jsx"));
const KitInstalacion = lazy(() => import("./pages/KitInstalacion.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Privacidad = lazy(() => import("./pages/Privacidad.jsx"));
const RecuperarPassword = lazy(() => import("./pages/RecuperarPassword.jsx"));
const RestablecerPassword = lazy(() => import("./pages/RestablecerPassword.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

// ── Admin (lazy: no entra en el bundle público) ──
const AdminLogin = lazy(() => import("./pages/AdminLogin.jsx"));
const AdminLayout = lazy(() => import("./components/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
const AdminOrders = lazy(() => import("./components/AdminOrders.jsx"));
const AdminProducts = lazy(() => import("./pages/AdminProducts.jsx"));
const AdminDestacados = lazy(() => import("./pages/AdminDestacados.jsx"));
const AdminImportar = lazy(() => import("./pages/AdminImportar.jsx"));
const AdminBanners = lazy(() => import("./pages/AdminBanners.jsx"));
const AdminConfig = lazy(() => import("./pages/AdminConfig.jsx"));
const AdminInstallKit = lazy(() => import("./pages/AdminInstallKit.jsx"));
const AdminCategories = lazy(() => import("./pages/AdminCategories.jsx"));
const AdminLanding = lazy(() => import("./pages/AdminLanding.jsx"));
const AdminUsers = lazy(() => import("./pages/AdminUsers.jsx"));
const AdminMetricas = lazy(() => import("./pages/AdminMetricas.jsx"));
const AdminAdministradores = lazy(() => import("./pages/AdminAdministradores.jsx"));

/**
 * Pantallas reservadas al administrador con acceso total.
 *
 * Es solo para que quien entre por URL vea una explicación en vez de una página
 * que falla al guardar. La autorización real está en el backend
 * (requireNivelTotal): el token se puede editar desde el navegador.
 */
function SoloTotal({ children }) {
  if (esAdminTotal()) return children;
  return (
    <div className="max-w-lg mx-auto bento p-6 text-center">
      <h1 className="text-lg font-bold" style={{ color: "var(--text)" }}>
        Esta sección no está disponible para tu cuenta
      </h1>
      <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
        Tu usuario tiene acceso limitado. Pedíselo a quien administra el sistema.
      </p>
      <Link
        to="/admin"
        className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-medium"
        style={{ background: "var(--brand)", color: "#fff" }}
      >
        Volver al panel
      </Link>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24" style={{ minHeight: "50vh" }}>
      <div
        className="w-8 h-8 rounded-full animate-spin"
        style={{ border: "3px solid var(--border)", borderTopColor: "var(--brand)" }}
      />
    </div>
  );
}

function PublicLayout() {
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    API.get("/site-config")
      .then((r) => setMaintenance(r.data.maintenanceMode === true))
      .catch(() => {});
  }, []);

  // Solo un admin real saltea el modo mantenimiento. Antes alcanzaba con que
  // existiera cualquier string en localStorage.token.
  if (maintenance && !isAdminToken()) return <MaintenancePage />;
  return <Layout />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Público */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="product/:productCode" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="kit-instalacion" element={<KitInstalacion />} />
            <Route path="contacto" element={<Contacto />} />
            <Route path="register" element={<Register />} />
            <Route path="login" element={<Login />} />
            <Route path="privacidad" element={<Privacidad />} />
            <Route path="recuperar-password" element={<RecuperarPassword />} />
            <Route path="restablecer-password" element={<RestablecerPassword />} />
            {/* Cualquier ruta desconocida cae acá en vez de mostrar el layout vacío */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin: login público */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin: rutas protegidas anidadas */}
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="destacados" element={<AdminDestacados />} />
            <Route path="importar" element={<SoloTotal><AdminImportar /></SoloTotal>} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="config" element={<SoloTotal><AdminConfig /></SoloTotal>} />
            <Route path="install-kit" element={<SoloTotal><AdminInstallKit /></SoloTotal>} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="landing" element={<SoloTotal><AdminLanding /></SoloTotal>} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="metricas" element={<AdminMetricas />} />
            <Route path="administradores" element={<AdminAdministradores />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
