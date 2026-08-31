import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import MaintenancePage from "./pages/MaintenancePage.jsx";
import API from "./api/axios.js";

// ── Páginas públicas (lazy: cada una en su chunk, no viajan en el primer load) ──
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Catalogo = lazy(() => import("./pages/Catalogo.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Contacto = lazy(() => import("./pages/Contacto.jsx"));
const KitInstalacion = lazy(() => import("./pages/KitInstalacion.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));

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

  const adminToken = localStorage.getItem("token");

  if (maintenance && !adminToken) return <MaintenancePage />;
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
            <Route path="importar" element={<AdminImportar />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="config" element={<AdminConfig />} />
            <Route path="install-kit" element={<AdminInstallKit />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="landing" element={<AdminLanding />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
