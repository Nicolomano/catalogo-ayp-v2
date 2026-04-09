import { Link, NavLink, Outlet } from "react-router-dom";
import { useCart } from "../Context/CartContext.jsx";
import { useAuth } from "../Context/AuthContext.jsx";
import { ShoppingCart, Menu, X, User, LogOut, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

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

  const navLinkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors relative pb-0.5 ${
      isActive
        ? "text-[var(--brand)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--brand)] after:rounded-full"
        : "text-[var(--muted)] hover:text-[var(--text)]"
    }`;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>

      {/* NAVBAR */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{
          background: "color-mix(in srgb, var(--surface) 88%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--brand)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>A&P</span>
              <span className="text-xs" style={{ color: "var(--muted)" }}>Refrigeración</span>
            </div>
          </Link>

          {/* Links desktop */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to="/" end className={navLinkCls}>Inicio</NavLink>
            <NavLink to="/catalogo" className={navLinkCls}>Catálogo</NavLink>
            <NavLink to="/kit-instalacion" className={navLinkCls}>Kit</NavLink>
            <NavLink to="/contacto" className={navLinkCls}>Contacto</NavLink>
            {isAdmin && <NavLink to="/admin" className={navLinkCls}>Admin</NavLink>}
          </nav>

          {/* Derecha */}
          <div className="flex items-center gap-2">

            {/* Toggle dark mode */}
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--muted)" }}
              title={dark ? "Modo claro" : "Modo oscuro"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Service user */}
            {serviceUser ? (
              <div className="hidden md:flex items-center gap-2">
                {isServiceApproved && (
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ background: "#DCFCE7", color: "#15803D" }}
                  >
                    Precio service
                  </span>
                )}
                <span className="text-sm" style={{ color: "var(--muted)" }}>{serviceUser.name}</span>
                <button
                  onClick={logoutService}
                  className="p-1 rounded transition-colors hover:text-red-500"
                  style={{ color: "var(--muted)" }}
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
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

            {/* Carrito */}
            <Link to="/cart" className="relative p-2 rounded-lg" style={{ color: "var(--muted)" }}>
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  style={{ background: "var(--brand)", fontSize: "9px" }}
                >
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Hamburguesa mobile */}
            <button
              className="md:hidden p-2 rounded-lg"
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
            className="md:hidden px-6 py-4 space-y-4 border-t"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {[
              { to: "/", label: "Inicio", end: true },
              { to: "/catalogo", label: "Catálogo" },
              { to: "/kit-instalacion", label: "Kit de Instalación" },
              { to: "/contacto", label: "Contacto" },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to} to={to} end={end}
                className={({ isActive }) =>
                  `block text-sm font-medium ${isActive ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}
                style={{ color: undefined }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin"
                className="block text-sm font-medium"
                style={{ color: "var(--muted)" }}
                onClick={() => setMenuOpen(false)}>
                Admin
              </NavLink>
            )}
            {serviceUser ? (
              <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{serviceUser.name}</p>
                {isServiceApproved && (
                  <span className="text-xs font-semibold px-2 py-1 rounded-full inline-block" style={{ background: "#DCFCE7", color: "#15803D" }}>
                    Precio service activo
                  </span>
                )}
                <button onClick={() => { logoutService(); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-sm text-red-500">
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </div>
            ) : (
              <Link to="/login"
                className="flex items-center gap-2 text-sm font-medium"
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

      {/* FOOTER */}
      <footer className="py-12 mt-8" style={{ background: "var(--dark-card)" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="font-bold text-white">A&P Refrigeración</span>
            </div>
            <p className="text-sm text-white/40 max-w-xs">Distribuidora de repuestos para refrigeración. Buenos Aires, Argentina.</p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <p className="text-xs text-white/30 mb-3 uppercase tracking-wider font-semibold">Catálogo</p>
              <div className="flex flex-col gap-2 text-white/50">
                <Link to="/catalogo" className="hover:text-white transition-colors">Todos los productos</Link>
                <Link to="/kit-instalacion" className="hover:text-white transition-colors">Kit de instalación</Link>
                <Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-3 uppercase tracking-wider font-semibold">Cuenta</p>
              <div className="flex flex-col gap-2 text-white/50">
                <Link to="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
                <Link to="/register" className="hover:text-white transition-colors">Registrarme</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-white/5 text-xs text-white/20">
          © {new Date().getFullYear()} A&P Refrigeración. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

export default Layout;
