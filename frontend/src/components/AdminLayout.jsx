import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Package,
  Image,
  Wrench,
  FolderTree,
  ClipboardList,
  Settings,
  Users,
  Home,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  UserCheck,
  Star,
  Menu,
  X,
} from "lucide-react";
import Logo from "./Logo.jsx";

const NAV_GROUPS = [
  {
    label: "Contenido",
    items: [
      { to: "/admin/landing",   icon: Home,      label: "Página de inicio" },
      { to: "/admin/banners",   icon: Image,     label: "Banners / Slider" },
      { to: "/admin/tecnicos",  icon: UserCheck, label: "Instaladores" },
    ],
  },
  {
    label: "Tienda",
    items: [
      { to: "/admin/products", icon: Package, label: "Productos" },
      { to: "/admin/destacados", icon: Star, label: "Destacados" },
      { to: "/admin/categories", icon: FolderTree, label: "Categorías" },
      { to: "/admin/install-kit", icon: Wrench, label: "Kit de instalación" },
    ],
  },
  {
    label: "Gestión",
    items: [
      { to: "/admin/orders", icon: ClipboardList, label: "Órdenes" },
      { to: "/admin/users", icon: Users, label: "Services" },
      { to: "/admin/config", icon: Settings, label: "Configuración" },
    ],
  },
];

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/admin/landing"}
      className={({ isActive }) =>
        `flex items-center gap-2.5 py-2 rounded-[10px] text-sm transition-all duration-150 ${
          isActive
            ? "bg-white/12 font-semibold text-white"
            : "font-normal text-white/65 hover:bg-white/8 hover:text-white/90"
        }`
      }
      style={({ isActive }) => ({
        paddingLeft: isActive ? "9px" : "12px",
        paddingRight: "12px",
        borderLeft: isActive ? "3px solid rgba(255,255,255,0.65)" : "3px solid transparent",
        textDecoration: "none",
      })}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span className="flex-1">{label}</span>
    </NavLink>
  );
}

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/admin/login");
  };

  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const current = allItems.find((item) =>
    location.pathname.startsWith(item.to),
  );
  const pageTitle = current?.label ?? "Panel de administración";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`w-60 flex flex-col fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #001A80 0%, #0033CC 100%)",
        }}
      >
        {/* Logo */}
        <div
          className="px-5 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <Logo height={30} color="#fff" className="mb-1" />
          <p className="text-white/40 text-xs font-medium tracking-widest uppercase mt-1">
            Panel admin
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p
                className="text-xs font-bold uppercase tracking-widest px-3 mb-1.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-3 pb-4 space-y-1 border-t pt-3"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm transition-colors"
            style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
            Ver tienda
          </a>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-left transition-colors"
            style={{
              color: "rgba(255,120,120,0.85)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <LogOut size={15} strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 md:ml-60 min-w-0">
        {/* Header */}
        <header
          className="sticky top-0 z-20 px-4 py-4 flex items-center gap-2 border-b"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 -ml-1 mr-1 rounded-lg transition-colors hover:bg-[var(--surface2)]"
            style={{ color: "var(--text)" }}
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Abrir menú"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            Admin
          </span>
          <ChevronRight size={14} style={{ color: "var(--muted)" }} />
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--text)" }}
          >
            {pageTitle}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
