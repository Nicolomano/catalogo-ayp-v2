import { Link, NavLink, Outlet } from "react-router-dom";
import { useCart } from "../Context/CartContext.jsx";
import { useAuth } from "../Context/AuthContext.jsx";
import { ShoppingCart, Menu, X, User, LogOut, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import WhatsappFloat from "./WhatsappFloat.jsx";

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
            <img
              src="/logo.png"
              alt="A&P Refrigeración"
              className="h-10 w-auto"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </Link>

          {/* Links desktop */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to="/" end className={navLinkCls}>Inicio</NavLink>
            <NavLink to="/catalogo" className={navLinkCls}>Productos</NavLink>
            <NavLink to="/kit-instalacion" className={navLinkCls}>Kit</NavLink>
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
                  className="p-1.5 rounded-xl transition-colors hover:bg-red-50 hover:text-red-500"
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
              className="relative p-2 rounded-xl transition-colors hover:bg-[var(--surface2)]"
              style={{ color: "var(--muted)" }}
            >
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

            <button
              className="md:hidden p-2 rounded-xl transition-colors hover:bg-[var(--surface2)]"
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
            className="md:hidden px-5 py-4 space-y-1 border-t animate-fade-up"
            style={{ borderColor: "var(--border)", borderRadius: "0 0 16px 16px", background: "var(--surface)" }}
          >
            {[
              { to: "/", label: "Inicio", end: true },
              { to: "/catalogo", label: "Productos" },
              { to: "/kit-instalacion", label: "Kit de Instalación" },
              { to: "/contacto", label: "Contacto" },
            ].map(({ to, label, end }) => (
              <NavLink
                key={to} to={to} end={end}
                className={({ isActive }) =>
                  `block text-sm font-medium py-2 px-2 rounded-lg transition-colors ${isActive ? "text-[var(--brand)] bg-[var(--brand-tint)]" : "text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"}`}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin"
                className="block text-sm font-medium py-2 px-2 rounded-lg transition-colors text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
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
                  className="flex items-center gap-2 text-sm font-medium text-red-500 py-2 px-2 rounded-lg hover:bg-red-50 w-full transition-colors">
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </div>
            ) : (
              <Link to="/login"
                className="flex items-center gap-2 text-sm font-semibold py-2 px-2 rounded-lg transition-colors hover:bg-[var(--brand-tint)]"
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

      {/* FOOTER */}
      <footer className="py-14 mt-8" style={{ background: "var(--dark-card)" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <img
              src="/logo.png"
              alt="A&P Refrigeración"
              className="h-10 w-auto mb-4"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              Distribuidora de repuestos para refrigeración comercial e industrial. Buenos Aires, Argentina.
            </p>
          </div>
          <div className="flex gap-14 text-sm">
            <div>
              <p className="text-xs text-white/30 mb-4 uppercase tracking-widest font-semibold">Tienda</p>
              <div className="flex flex-col gap-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Link to="/catalogo" className="hover:text-white transition-colors">Todos los productos</Link>
                <Link to="/kit-instalacion" className="hover:text-white transition-colors">Kit de instalación</Link>
                <Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/30 mb-4 uppercase tracking-widest font-semibold">Cuenta</p>
              <div className="flex flex-col gap-2.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                <Link to="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
                <Link to="/register" className="hover:text-white transition-colors">Registrarme</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-white/5 text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
          © {new Date().getFullYear()} A&P Refrigeración. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}

export default Layout;
