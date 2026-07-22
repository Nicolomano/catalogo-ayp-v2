// src/pages/AdminInstallKit.jsx
import { useEffect, useState } from "react";
import API from "../api/axios";
import toast from "react-hot-toast";

const UNITS = ["m", "u"];

const inputCls = "border rounded px-2 py-1 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = { background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" };

export default function AdminInstallKit() {
  const [kit, setKit] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await API.get("/config/install-kit"); // { items: [...] }
        setKit(res.data || { items: [] });
      } catch (e) {
        toast.error("No se pudo cargar la configuración", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateItem = (index, patch) => {
    setKit((prev) => {
      const next = { ...prev, items: [...prev.items] };
      next.items[index] = { ...next.items[index], ...patch };
      return next;
    });
  };

  const addItem = () => {
    setKit((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          key: "",
          label: "",
          unit: "m",
          step: 0.5,
          defaultQty: 0,
          // por defecto sin variantes; si agrega variantes, borrá productCode
          productCode: "",
          variants: [],
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setKit((prev) => {
      const next = { ...prev, items: [...prev.items] };
      next.items.splice(index, 1);
      return next;
    });
  };

  const addVariant = (i) => {
    const item = kit.items[i];
    const variants = Array.isArray(item.variants) ? item.variants : [];
    updateItem(i, {
      variants: [...variants, { value: "", productCode: "" }],
      productCode: "",
    });
  };

  const updateVariant = (i, vi, patch) => {
    const item = kit.items[i];
    const variants = [...(item.variants || [])];
    variants[vi] = { ...variants[vi], ...patch };
    updateItem(i, { variants });
  };

  const removeVariant = (i, vi) => {
    const item = kit.items[i];
    const variants = [...(item.variants || [])];
    variants.splice(vi, 1);
    updateItem(i, { variants });
  };

  const normalizeBeforeSave = (data) => {
    // Limpieza: si tiene variantes, eliminar productCode plano
    const items = (data.items || []).map((it) => {
      const clean = { ...it };
      if (Array.isArray(clean.variants) && clean.variants.length > 0) {
        delete clean.productCode;
        clean.variants = clean.variants.filter(
          (v) =>
            v && v.value?.toString().trim() && v.productCode?.toString().trim()
        );
      } else {
        delete clean.variants;
        clean.productCode = (clean.productCode || "").trim();
      }
      clean.key = (clean.key || "").trim();
      clean.label = (clean.label || "").trim();
      clean.unit = UNITS.includes(clean.unit) ? clean.unit : "m";
      const step = Number(clean.step);
      clean.step =
        !isNaN(step) && step > 0 ? step : clean.unit === "u" ? 1 : 0.5;
      const def = Number(clean.defaultQty);
      clean.defaultQty = !isNaN(def) && def >= 0 ? def : 0;
      return clean;
    });

    // Validaciones simples
    const keys = items.map((i) => i.key);
    const dup = keys.find((k, idx) => k && keys.indexOf(k) !== idx);
    if (dup) throw new Error(`Clave repetida: "${dup}"`);
    const emptyKey = items.find((i) => !i.key);
    if (emptyKey) throw new Error("Hay ítems sin 'key'");
    const bad = items.find(
      (i) =>
        !i.label ||
        !i.unit ||
        (Array.isArray(i.variants) &&
          i.variants.length === 0 &&
          !i.productCode) ||
        (Array.isArray(i.variants) &&
          i.variants.some((v) => !v.value || !v.productCode))
    );
    if (bad)
      throw new Error(
        "Completá label/unit y productCode o variantes en todos los ítems"
      );

    return { installKit: { items } };
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = normalizeBeforeSave(kit);
      await API.put("/config/install-kit", payload);
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4" style={{ color: "var(--muted)" }}>Cargando…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Configuración de Kit de Instalación
        </h2>
        <p style={{ color: "var(--muted)" }}>
          Agregá o modificá los ítems disponibles.
        </p>
      </div>

      <div className="bento overflow-x-auto" style={{ borderRadius: "16px" }}>
        <table className="w-full text-sm" style={{ color: "var(--text)" }}>
          <thead className="text-left" style={{ background: "var(--brand)", color: "#fff" }}>
            <tr>
              <th className="p-2">Acciones</th>
              <th className="p-2">Key</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Unidad</th>
              <th className="p-2">Paso</th>
              <th className="p-2">Default</th>
              <th className="p-2">ProductCode</th>
              <th className="p-2">Variantes (value → productCode)</th>
            </tr>
          </thead>
          <tbody>
            {kit.items.map((it, i) => (
              <tr key={i} className="align-top" style={{ borderTop: "1px solid var(--border)" }}>
                <td className="p-2 space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => removeItem(i)}
                    className="px-2 py-1 rounded text-sm font-medium"
                    style={{ background: "var(--error-tint)", color: "var(--error)" }}
                    title="Eliminar ítem"
                  >
                    Eliminar
                  </button>
                </td>

                <td className="p-2">
                  <input
                    value={it.key || ""}
                    onChange={(e) => updateItem(i, { key: e.target.value })}
                    className={inputCls + " w-40"}
                    style={inputStyle}
                    placeholder="copper_small"
                  />
                </td>

                <td className="p-2">
                  <input
                    value={it.label || ""}
                    onChange={(e) => updateItem(i, { label: e.target.value })}
                    className={inputCls + " w-56"}
                    style={inputStyle}
                    placeholder="Caño cobre (líquido)"
                  />
                </td>

                <td className="p-2">
                  <select
                    value={it.unit || "m"}
                    onChange={(e) => updateItem(i, { unit: e.target.value })}
                    className={inputCls}
                    style={inputStyle}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={it.step ?? (it.unit === "u" ? 1 : 0.5)}
                    onChange={(e) =>
                      updateItem(i, { step: Number(e.target.value) })
                    }
                    className={inputCls + " w-20 text-right"}
                    style={inputStyle}
                  />
                </td>

                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    step={it.unit === "u" ? 1 : 0.5}
                    value={it.defaultQty ?? 0}
                    onChange={(e) =>
                      updateItem(i, { defaultQty: Number(e.target.value) })
                    }
                    className={inputCls + " w-20 text-right"}
                    style={inputStyle}
                  />
                </td>

                <td className="p-2">
                  {/* Si tiene variantes, ocultamos productCode plano */}
                  <input
                    value={
                      it.variants && it.variants.length
                        ? ""
                        : it.productCode || ""
                    }
                    onChange={(e) =>
                      updateItem(i, { productCode: e.target.value })
                    }
                    className={inputCls + " w-56"}
                    style={{ ...inputStyle, opacity: it.variants?.length ? 0.5 : 1 }}
                    placeholder={
                      it.variants?.length ? "— con variantes —" : "SKU único"
                    }
                    disabled={!!(it.variants && it.variants.length)}
                  />
                </td>

                <td className="p-2">
                  <div className="space-y-2">
                    {(it.variants || []).map((v, vi) => (
                      <div key={vi} className="flex gap-2">
                        <input
                          value={v.value || ""}
                          onChange={(e) =>
                            updateVariant(i, vi, { value: e.target.value })
                          }
                          className={inputCls + " w-28"}
                          style={inputStyle}
                          placeholder="1/4 | 5×1.5 | 52"
                        />
                        <span className="self-center" style={{ color: "var(--muted)" }}>→</span>
                        <input
                          value={v.productCode || ""}
                          onChange={(e) =>
                            updateVariant(i, vi, {
                              productCode: e.target.value,
                            })
                          }
                          className={inputCls + " w-44"}
                          style={inputStyle}
                          placeholder="SKU (COBRE-1-4)"
                        />
                        <button
                          onClick={() => removeVariant(i, vi)}
                          className="px-2 py-1 rounded text-sm font-medium"
                          style={{ background: "var(--surface2)", color: "var(--text)", border: "1px solid var(--border)" }}
                          title="Quitar variante"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addVariant(i)}
                      className="px-2 py-1 rounded text-sm font-medium text-white"
                      style={{ background: "var(--brand)" }}
                    >
                      + Agregar variante
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* Fila "agregar" */}
            <tr style={{ borderTop: "1px solid var(--border)" }}>
              <td className="p-2" colSpan={8}>
                <button
                  onClick={addItem}
                  className="px-3 py-2 rounded text-sm font-semibold text-white"
                  style={{ background: "var(--brand)" }}
                >
                  + Agregar ítem
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--success)" }}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
