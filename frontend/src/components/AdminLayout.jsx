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
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Contenido",
    items: [
      { to: "/admin/landing", icon: Home, label: "Página de inicio" },
      { to: "/admin/banners", icon: Image, label: "Banners / Slider" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { to: "/admin/products", icon: Package, label: "Productos" },
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
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: isActive ? "600" : "400",
        background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
        transition: "all 0.15s ease",
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
      {/* ── Sidebar ── */}
      <aside
        className="w-60 flex flex-col fixed top-0 left-0 h-full z-30"
        style={{
          background: "linear-gradient(180deg, #001A80 0%, #0033CC 100%)",
        }}
      >
        {/* Logo */}
        <div
          className="px-5 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          <p className="text-white font-black text-lg tracking-tight">A&P</p>
          <p className="text-white/50 text-xs font-medium tracking-wider uppercase mt-0.5">
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
            Ver catálogo
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
      <div className="flex-1 flex flex-col" style={{ marginLeft: "240px" }}>
        {/* Header */}
        <header
          className="sticky top-0 z-20 px-6 py-4 flex items-center gap-2 border-b"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 1px 0 var(--border)",
          }}
        >
          <span
            className="text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            Admin
          </span>
          <ChevronRight size={14} style={{ color: "var(--muted)" }} />
          <span
            className="text-sm font-semibold"
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
