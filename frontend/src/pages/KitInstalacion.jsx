// src/pages/KitInstalacion.jsx
import { useEffect, useMemo, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";
import { useAuth } from "../Context/AuthContext.jsx";

const stepperClamp = (n, step = 0.5) =>
  Math.max(0, Math.round(n / step) * step);

const inputCls = "border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

export default function KitInstalacion() {
  const { isServiceApproved } = useAuth();
  // Aplica 10% de descuento service a un precio (solo si el técnico está aprobado)
  const disc = (v) => (isServiceApproved ? Math.round((v || 0) * 0.9) : v);

  const [meta, setMeta]       = useState([]);
  const [qty, setQty]         = useState({});
  const [variant, setVariant] = useState({});
  const [pricing, setPricing] = useState({ lines: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [waNumber, setWaNumber] = useState("");

  /* Cargar metadata + WhatsApp */
  useEffect(() => {
    API.get("/kits/install/meta")
      .then((res) => {
        const items = res.data.items || [];
        setMeta(items);
        const initialQty = {};
        const initialVar = {};
        items.forEach((it) => {
          initialQty[it.key] = it.defaultQty ?? 0;
          if (Array.isArray(it.variants) && it.variants.length) {
            initialVar[it.key] = it.variants[0].value;
          }
        });
        setQty(initialQty);
        setVariant(initialVar);
      })
      .catch(() => toast.error("No se pudo cargar el kit"));

    API.get("/site-config")
      .then((r) => setWaNumber((r.data?.whatsapp || "").replace(/\D/g, "")))
      .catch(() => {});
  }, []);

  /* Exclusión: patas de ménsula vs piso */
  const handleQty = (key, value) => {
    const item = meta.find((i) => i.key === key);
    const step = item?.step || 0.5;
    const v = stepperClamp(Number(value || 0), step);
    setQty((prev) => {
      const next = { ...prev, [key]: v };
      if (key === "feet_bracket" && v > 0) next["feet_floor"] = 0;
      if (key === "feet_floor" && v > 0) next["feet_bracket"] = 0;
      return next;
    });
  };

  const handleVariant = (key, value) =>
    setVariant((prev) => ({ ...prev, [key]: value }));

  /* Calcular precio */
  const fetchPrice = async () => {
    try {
      setLoading(true);
      const res = await API.post("/kits/install/price", { quantities: qty, variant });
      setPricing(res.data);
    } catch {
      toast.error("No se pudo calcular el precio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (meta.length) fetchPrice(); }, [qty, variant, meta.length]);

  /* Texto WhatsApp */
  const waText = useMemo(() => {
    const lines = pricing.lines
      .map((l) => {
        const varLabel = l.variant
          ? ` (${l.key === "bracket" ? `${l.variant} cm` : l.variant})`
          : "";
        return `• ${l.label}${varLabel}: ${l.qty} ${l.unit} — $${disc(l.unitPriceARS).toLocaleString("es-AR")} c/u`;
      })
      .join("%0A");
    const serviceNote = isServiceApproved ? "%0A(Precios con descuento service -10%)" : "";
    return `Hola! Quiero cotizar el siguiente kit de instalación:%0A${lines}%0A%0ATotal: $${disc(pricing.total).toLocaleString("es-AR")}${serviceNote}`;
  }, [pricing, isServiceApproved]);

  const variantLabel = (key) => {
    if (key === "copper_small" || key === "copper_big") return "Medida:";
    if (key === "cable")      return "Sección:";
    if (key === "insulation") return "Para caños:";
    if (key === "bracket")    return "Tamaño:";
    return "Variante:";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Encabezado */}
      <div>
        <span
          className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-3"
          style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
        >
          Calculadora
        </span>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Kit de instalación
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Ajustá cantidades y elegí las variantes. El total se calcula automáticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Configurador ── */}
        <section className="bento p-4 sm:p-6 space-y-4">
          <h2 className="text-base font-bold pb-2 border-b"
            style={{ color: "var(--text)", borderColor: "var(--border)" }}>
            Configuración
          </h2>

          {!meta.length ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton skeleton-text w-3/4" />
                    <div className="skeleton skeleton-text w-1/2" style={{ height: "1.5rem" }} />
                  </div>
                  <div className="flex gap-1.5 self-end sm:self-auto">
                    <div className="skeleton w-11 h-11 rounded-xl" />
                    <div className="skeleton w-16 h-11 rounded-xl" />
                    <div className="skeleton w-11 h-11 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            meta.map((item) => (
              <div key={item.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    {item.label}
                  </p>

                  {Array.isArray(item.variants) && item.variants.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {variantLabel(item.key)}
                      </span>
                      <select
                        value={variant[item.key] || item.variants[0].value}
                        onChange={(e) => handleVariant(item.key, e.target.value)}
                        className={inputCls + " text-xs py-1 px-2"}
                        style={inputStyle}
                      >
                        {item.variants.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.value}{item.key === "bracket" ? " cm" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => handleQty(item.key, (qty[item.key] || 0) - (item.step || 0.5))}
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:bg-[var(--brand)] hover:text-white hover:border-[var(--brand)]"
                    style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}
                  >−</button>
                  <input
                    type="number"
                    step={item.step || 0.5}
                    min="0"
                    value={qty[item.key] ?? 0}
                    onChange={(e) => handleQty(item.key, e.target.value)}
                    className="input-field w-16 text-center text-sm"
                    style={{ padding: "6px 4px" }}
                  />
                  <button
                    onClick={() => handleQty(item.key, (qty[item.key] || 0) + (item.step || 0.5))}
                    className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-sm font-bold transition-all hover:bg-[var(--brand)] hover:text-white hover:border-[var(--brand)]"
                    style={{ background: "var(--surface2)", color: "var(--text)", border: "1.5px solid var(--border)" }}
                  >+</button>
                  <span className="w-8 text-xs text-right" style={{ color: "var(--muted)" }}>
                    {item.unit}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Resumen ── */}
        <section className="bento p-6 space-y-3">
          <h2 className="text-base font-bold pb-2 border-b"
            style={{ color: "var(--text)", borderColor: "var(--border)" }}>
            Resumen
          </h2>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="skeleton skeleton-text w-3/5" />
                    <div className="skeleton skeleton-text w-2/5" />
                  </div>
                  <div className="skeleton skeleton-text w-16" />
                </div>
              ))}
            </div>
          ) : pricing.lines.length ? (
            <>
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {pricing.lines.map((l) => (
                  <li key={l.key} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {l.label}
                        {l.variant
                          ? ` (${l.key === "bracket" ? `${l.variant} cm` : l.variant})`
                          : ""}
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {l.qty} {l.unit} × ${disc(l.unitPriceARS).toLocaleString("es-AR")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold flex-shrink-0" style={{ color: "var(--text)" }}>
                      ${disc(l.subtotal).toLocaleString("es-AR")}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t flex items-center justify-between gap-2"
                style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>Total estimado</span>
                  {isServiceApproved && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                    >
                      Precio service · -10%
                    </span>
                  )}
                </div>
                <span className="text-2xl font-black" style={{ color: "var(--brand)" }}>
                  ${disc(pricing.total).toLocaleString("es-AR")}
                </span>
              </div>

              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors"
                  style={{ background: "#25D366" }}
                >
                  <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
                    <path d="M16.003 2.667C8.638 2.667 2.667 8.638 2.667 16c0 2.358.627 4.67 1.817 6.694L2.667 29.333l6.825-1.789A13.29 13.29 0 0016.003 29.333c7.365 0 13.33-5.97 13.33-13.333S23.368 2.667 16.003 2.667zm6.059 18.264c-.331-.167-1.96-.968-2.264-1.079-.305-.107-.527-.167-.748.166-.223.33-.86 1.079-1.054 1.3-.196.222-.39.248-.72.083-.331-.166-1.398-.515-2.663-1.643-.984-.878-1.648-1.962-1.843-2.293-.194-.33-.02-.51.146-.674.15-.149.33-.389.496-.583.167-.194.222-.332.333-.554.11-.222.055-.416-.028-.583-.083-.167-.748-1.803-1.025-2.47-.27-.648-.545-.56-.748-.57l-.637-.011c-.222 0-.582.083-.888.415-.305.33-1.164 1.137-1.164 2.773 0 1.637 1.192 3.218 1.358 3.44.167.222 2.346 3.584 5.685 5.027.795.343 1.415.547 1.899.7.798.253 1.525.217 2.099.132.64-.096 1.97-.806 2.247-1.584.278-.778.278-1.445.194-1.584-.083-.14-.305-.222-.637-.389z"/>
                  </svg>
                  Enviar por WhatsApp
                </a>
              )}
            </>
          ) : (
            <p className="text-sm py-4 text-center" style={{ color: "var(--muted)" }}>
              Elegí cantidades para ver el total.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
