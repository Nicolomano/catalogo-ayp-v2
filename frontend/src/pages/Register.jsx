import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import toast from "react-hot-toast";
import { UploadCloud, X, MessageCircle } from "lucide-react";

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
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    company: "", cuit: "", province: "", phone: "",
  });

  useEffect(() => {
    API.get("/site-config")
      .then((res) => { if (res.data?.adminWhatsapp) setAdminWhatsapp(res.data.adminWhatsapp); })
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5 MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleNoMatricula = () => {
    const number = adminWhatsapp || "5491100000000";
    const msg = encodeURIComponent(
      `Hola, quiero registrarme como técnico service pero no tengo matrícula. Mi nombre es ${form.name || "..."}.`
    );
    window.open(`https://wa.me/${number}?text=${msg}`, "_blank", "noopener");
  };

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
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("company", form.company);
      fd.append("cuit", form.cuit);
      fd.append("province", form.province);
      fd.append("phone", form.phone);
      if (imageFile) fd.append("matriculaImage", imageFile);

      await API.post("/users/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
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
            <Field label="CUIT" required>
              <input
                type="text"
                value={form.cuit}
                onChange={set("cuit")}
                required
                placeholder="20-12345678-9"
                className={inputCls}
                style={inputStyle}
              />
            </Field>
            <Field label="Empresa / Taller">
              <input type="text" value={form.company} onChange={set("company")} className={inputCls} style={inputStyle} />
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

          {/* Matrícula / certificado */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
              Foto de matrícula o certificado de estudio
            </label>
            {!imagePreview ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <label
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  <UploadCloud size={18} />
                  <span className="text-sm">Subir imagen (JPG, PNG, WEBP — máx. 5 MB)</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleNoMatricula}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0"
                  style={{ background: "rgba(37,211,102,0.12)", color: "#16A34A", border: "1px solid rgba(37,211,102,0.3)" }}
                >
                  <MessageCircle size={15} />
                  No tengo matrícula
                </button>
              </div>
            ) : (
              <div className="relative w-fit">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="rounded-xl object-cover border"
                  style={{ maxHeight: "140px", maxWidth: "100%", borderColor: "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#DC2626" }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
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
