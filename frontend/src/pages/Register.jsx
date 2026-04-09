import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import toast from "react-hot-toast";

const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
];

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    company: "", matricula: "", province: "", phone: "",
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (form.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await API.post("/users/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        company: form.company,
        matricula: form.matricula,
        province: form.province,
        phone: form.phone,
      });
      toast.success("Registro enviado. Te avisaremos cuando tu cuenta sea aprobada.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ayp flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Registro para Services</h1>
        <p className="text-sm text-gray-500 mb-6">
          Completá tus datos para acceder a precios especiales. Tu cuenta será revisada y aprobada en breve.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nombre y apellido *</span>
              <input type="text" value={form.name} onChange={set("name")} required
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email *</span>
              <input type="email" value={form.email} onChange={set("email")} required
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Contraseña *</span>
              <input type="password" value={form.password} onChange={set("password")} required
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Confirmar contraseña *</span>
              <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Empresa / Taller</span>
              <input type="text" value={form.company} onChange={set("company")}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Número de matrícula</span>
              <input type="text" value={form.matricula} onChange={set("matricula")}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Provincia</span>
              <select value={form.province} onChange={set("province")}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccioná una provincia</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Teléfono</span>
              <input type="tel" value={form.phone} onChange={set("phone")}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold mt-2 disabled:opacity-50">
            {loading ? "Enviando..." : "Enviar solicitud de registro"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">Iniciá sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
