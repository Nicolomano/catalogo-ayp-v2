import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";
import Contacto from "./pages/Contacto.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import AdminProducts from "./pages/AdminProducts.jsx";
import AdminConfig from "./pages/AdminConfig.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminOrders from "./components/AdminOrders.jsx";
import AdminBanners from "./pages/AdminBanners.jsx";
import AdminLanding from "./pages/AdminLanding.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import KitInstalacion from "./pages/KitInstalacion.jsx";
import AdminInstallKit from "./pages/AdminInstallKit.jsx";
import AdminCategories from "./pages/AdminCategories.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Layout />}>
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
          <Route path="banners" element={<AdminBanners />} />
          <Route path="config" element={<AdminConfig />} />
          <Route path="install-kit" element={<AdminInstallKit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="landing" element={<AdminLanding />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
