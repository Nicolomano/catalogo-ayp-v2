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

const inputCls = "w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
        {label}{required && <span style={{ color: "var(--brand)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

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
        name: form.name, email: form.email, password: form.password,
        company: form.company, matricula: form.matricula,
        province: form.province, phone: form.phone,
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      <div className="bento w-full max-w-lg p-8" style={{ borderRadius: "24px" }}>
        <div className="mb-6">
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-3"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            Precio Service
          </span>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Registro para Services</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Completá tus datos. Tu cuenta será revisada y aprobada en breve.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre y apellido" required>
              <input type="text" value={form.name} onChange={set("name")} required className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Email" required>
              <input type="email" value={form.email} onChange={set("email")} required className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Contraseña" required>
              <input type="password" value={form.password} onChange={set("password")} required className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Confirmar contraseña" required>
              <input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} required className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Empresa / Taller">
              <input type="text" value={form.company} onChange={set("company")} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Número de matrícula">
              <input type="text" value={form.matricula} onChange={set("matricula")} className={inputCls} style={inputStyle} />
            </Field>
            <Field label="Provincia">
              <select value={form.province} onChange={set("province")} className={inputCls} style={inputStyle}>
                <option value="">Seleccioná una provincia</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={form.phone} onChange={set("phone")} className={inputCls} style={inputStyle} />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50 transition-colors mt-2"
            style={{ background: "var(--brand)" }}
          >
            {loading ? "Enviando…" : "Enviar solicitud de registro"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" style={{ color: "var(--brand)" }} className="font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
