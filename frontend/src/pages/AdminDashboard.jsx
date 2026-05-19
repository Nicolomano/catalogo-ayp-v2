import DashboardData from "../components/DashboardData.jsx";
import AdminProducts from "./AdminProducts.jsx";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Métricas */}
      <section className="space-y-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Panel de Administración
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Resumen general de la tienda
          </p>
        </div>
        <DashboardData />
      </section>

      {/* Gestión de productos */}
      <section>
        <AdminProducts />
      </section>
    </div>
  );
}
