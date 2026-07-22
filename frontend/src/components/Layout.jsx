import { Link, NavLink, Outlet } from "react-router-dom";
import { useCart } from "../Context/CartContext.jsx";
import { useAuth } from "../Context/AuthContext.jsx";
import { ShoppingCart, Menu, X, User, LogOut, Sun, Moon, Home, Package, Wrench, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import WhatsappFloat from "./WhatsappFloat.jsx";
import Logo from "./Logo.jsx";

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

function Layout() {
  const { cart } = useCart();
  const { serviceUser, logoutService, isServiceApproved } = useAuth();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const adminToken = localStorage.getItem("token");
  const isAdmin = adminToken && !serviceUser;
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useDarkMode();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors relative pb-1 ${
      isActive
        ? "text-[var(--brand)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--brand)] after:rounded-full"
        : "text-[var(--text2)] hover:text-[var(--text)]"
    }`;

  return (
    <div className="flex flex-col min-h-screen layout-body" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* NAVBAR FLOTANTE */}
      <header className={`floating-navbar${scrolled ? " scrolled" : ""}`}>
        <div className="px-4 sm:px-5 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Logo height={46} />
          </Link>

          {/* Links desktop */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to="/" end className={navLinkCls}>Inicio</NavLink>
            <NavLink to="/catalogo" className={navLinkCls}>Productos</NavLink>
            <NavLink to="/kit-instalacion" className={navLinkCls}>Kit</NavLink>
            <NavLink to="/tecnicos" className={navLinkCls}>Técnicos</NavLink>
            <NavLink to="/contacto" className={navLinkCls}>Contacto</NavLink>
            {isAdmin && <NavLink to="/admin" className={navLinkCls}>Admin</NavLink>}
          </nav>

          {/* Derecha */}
          <div className="flex items-center gap-1.5">

            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-xl transition-colors hover:bg-[var(--surface2)]"
              style={{ color: "var(--muted)" }}
              title={dark ? "Modo claro" : "Modo oscuro"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {serviceUser ? (
              <div className="hidden md:flex items-center gap-2">
                {isServiceApproved && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: "#DCFCE7", color: "#15803D" }}
                  >
                    Precio service
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: "var(--text2)" }}>{serviceUser.name}</span>
                <button
                  onClick={logoutService}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors hover:bg-red-50 hover:text-red-500"
                  style={{ color: "var(--muted)" }}
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:scale-[1.02]"
                style={{
                  color: "var(--brand)",
                  borderColor: "var(--brand)",
                  background: "var(--brand-tint)",
                }}
              >
                <User className="h-3 w-3" />
                Soy service
              </Link>
            )}

            <Link
              to="/cart"
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface2)]"
              style={{ color: "var(--muted)" }}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span
                  key={totalItems}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white font-bold rounded-full flex items-center justify-center cart-badge-animate"
                  style={{ background: "var(--brand)", fontSize: "9px" }}
                >
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--surface2)]"
              style={{ color: "var(--muted)" }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Menú mobile */}
        {menuOpen && (
          <nav
            className="md:hidden px-5 py-4 space-y-1 border-t menu-enter"
            style={{ borderColor: "var(--border)", borderRadius: "0 0 16px 16px", background: "var(--surface)" }}
          >
            {[
              { to: "/", label: "Inicio", end: true },
              { to: "/catalogo", label: "Productos" },
              { to: "/kit-instalacion", label: "Kit de Instalación" },
              { to: "/tecnicos", label: "Técnicos Recomendados" },
              { to: "/contacto", label: "Contacto" },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to} to={to} end={end}
                className={({ isActive }) =>
                  `block text-sm font-medium py-3 px-3 rounded-lg transition-colors ${isActive ? "text-[var(--brand)] bg-[var(--brand-tint)]" : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin"
                className="block text-sm font-medium py-3 px-3 rounded-lg transition-colors text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
                onClick={() => setMenuOpen(false)}>
                Admin
              </NavLink>
            )}
            {serviceUser ? (
              <div className="pt-3 mt-2 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium px-2" style={{ color: "var(--text2)" }}>{serviceUser.name}</p>
                {isServiceApproved && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block ml-2" style={{ background: "#DCFCE7", color: "#15803D" }}>
                    Precio service activo
                  </span>
                )}
                <button onClick={() => { logoutService(); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-sm font-medium text-red-500 py-3 px-3 rounded-lg hover:bg-red-50 w-full transition-colors">
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </div>
            ) : (
              <Link to="/login"
                className="flex items-center gap-2 text-sm font-semibold py-3 px-3 rounded-lg transition-colors hover:bg-[var(--brand-tint)]"
                style={{ color: "var(--brand)" }}
                onClick={() => setMenuOpen(false)}>
                <User className="h-4 w-4" /> Soy service — Iniciar sesión
              </Link>
            )}
          </nav>
        )}
      </header>

      <main className="flex-grow w-full">
        <Outlet />
      </main>

      <WhatsappFloat />

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
          <Home className="h-5 w-5" />
          Inicio
        </NavLink>
        <NavLink to="/catalogo" className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
          <Package className="h-5 w-5" />
          Productos
        </NavLink>
        <NavLink to="/kit-instalacion" className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
          <Wrench className="h-5 w-5" />
          Kit
        </NavLink>
        <NavLink to="/tecnicos" className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
          <UserCheck className="h-5 w-5" />
          Técnicos
        </NavLink>
        <NavLink to="/cart" className={({ isActive }) => `bottom-nav-item relative${isActive ? " active" : ""}`}>
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span
                key={totalItems}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 text-white font-bold rounded-full flex items-center justify-center cart-badge-animate"
                style={{ background: "var(--brand)", fontSize: "9px" }}
              >
                {totalItems}
              </span>
            )}
          </div>
          Pedido
        </NavLink>
      </nav>

      {/* FOOTER */}
      <footer className="py-14 mt-8 relative overflow-hidden" style={{ background: "var(--dark-card)" }}>
        {/* Dot grid decoration */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Aurora radial esquina */}
        <div
          className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right, rgba(0,51,204,0.2) 0%, transparent 65%)" }}
        />
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-10 relative">
          <div className="max-w-xs">
            <Logo height={40} color="#fff" className="mb-4" />
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              Distribuidora de repuestos para refrigeración comercial e industrial. Buenos Aires, Argentina.
            </p>
          </div>
          <div className="flex gap-14 text-sm">
            <div>
              <p className="text-xs text-white/30 mb-4 uppercase tracking-widest font-semibold">Tienda</p>
              <div className="flex flex-col gap-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Link to="/catalogo" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Todos los productos</Link>
                <Link to="/kit-instalacion" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Kit de instalación</Link>
                <Link to="/contacto" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Contacto</Link>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-4 uppercase tracking-widest font-semibold">Cuenta</p>
              <div className="flex flex-col gap-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Link to="/login" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Iniciar sesión</Link>
                <Link to="/register" className="hover:text-white transition-colors hover:translate-x-0.5 inline-block">Registrarme</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/5 text-xs relative" style={{ color: "rgba(255,255,255,0.18)" }}>
          © {new Date().getFullYear()} A&P Refrigeración. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

export default Layout;
