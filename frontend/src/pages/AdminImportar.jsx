import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import toast from "react-hot-toast";
import { useConfirm } from "../Context/ConfirmContext.jsx";
import { Upload, FileSpreadsheet, PlusCircle, RefreshCw, Trash2, EyeOff, Check } from "lucide-react";

const RENDER_CAP = 1000; // límite de filas renderizadas por lista (las acciones masivas aplican a todas)

const money = (v) => (v || v === 0 ? `$${Number(v).toLocaleString("es-AR")}` : "—");

export default function AdminImportar() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState("upload"); // upload | review | result
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  // Selección: nuevos tildados (Set de códigos), acción por faltante ({code: 'keep'|'deactivate'|'delete'})
  const [newSelected, setNewSelected] = useState(() => new Set());
  const [missingAction, setMissingAction] = useState({});

  const reset = () => {
    setStep("upload"); setFile(null); setPreview(null); setResult(null);
    setNewSelected(new Set()); setMissingAction({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await API.post("/products/import/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data;
      setPreview(data);
      setNewSelected(new Set((data.toCreate || []).map((p) => p.code)));
      const actions = {};
      (data.missing || []).forEach((m) => { actions[m.productCode] = "keep"; });
      setMissingAction(actions);
      setStep("review");
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo analizar el Excel");
    } finally {
      setAnalyzing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleNew = (code) =>
    setNewSelected((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  const allNewChecked = preview && newSelected.size === (preview.toCreate?.length || 0);
  const toggleAllNew = () =>
    setNewSelected(allNewChecked ? new Set() : new Set((preview.toCreate || []).map((p) => p.code)));

  const setMissing = (code, action) =>
    setMissingAction((prev) => ({ ...prev, [code]: action }));
  const setAllMissing = (action) =>
    setMissingAction(() => {
      const next = {};
      (preview.missing || []).forEach((m) => { next[m.productCode] = action; });
      return next;
    });

  const counts = preview?.counts || { toCreate: 0, toUpdate: 0, missing: 0 };
  const newToCreate = preview ? (preview.toCreate || []).filter((p) => newSelected.has(p.code)).length : 0;
  const toDelete = Object.values(missingAction).filter((a) => a === "delete").length;
  const toDeactivate = Object.values(missingAction).filter((a) => a === "deactivate").length;

  const handleCommit = async () => {
    const ok = await confirm({
      title: "Confirmar importación",
      message: `Se van a crear ${newToCreate} productos, actualizar ${counts.toUpdate}, eliminar ${toDelete} y desactivar ${toDeactivate}. ¿Confirmás?`,
      confirmText: "Importar",
      tone: toDelete > 0 ? "danger" : "default",
    });
    if (!ok) return;

    const skipNewCodes = (preview.toCreate || []).filter((p) => !newSelected.has(p.code)).map((p) => p.code);
    const deleteCodes = Object.entries(missingAction).filter(([, a]) => a === "delete").map(([c]) => c);
    const deactivateCodes = Object.entries(missingAction).filter(([, a]) => a === "deactivate").map(([c]) => c);

    setCommitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("decisions", JSON.stringify({ skipNewCodes, deleteCodes, deactivateCodes }));
      const res = await API.post("/products/import/commit", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStep("result");
      toast.success("Importación aplicada");
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo importar");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Importar Excel</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          Subí el Excel, revisá los cambios y confirmá antes de aplicarlos.
        </p>
      </div>

      {/* ── PASO 1: subir ── */}
      {step === "upload" && (
        <div className="bento p-8 text-center">
          <FileSpreadsheet size={40} style={{ color: "var(--brand)", margin: "0 auto 14px" }} />
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
            Formatos aceptados: .xlsx, .xls, .csv (sistema contable o exportación clásica).
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            <Upload size={16} /> {analyzing ? "Analizando…" : "Elegir archivo"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>
      )}

      {/* ── PASO 2: revisar ── */}
      {step === "review" && preview && (
        <>
          {/* Resumen */}
          <div className="bento p-4 flex flex-wrap gap-2">
            <Badge icon={PlusCircle} label={`${counts.toCreate} nuevos`} color="var(--brand)" tint="var(--brand-tint)" />
            <Badge icon={RefreshCw} label={`${counts.toUpdate} a actualizar`} color="#B45309" tint="rgba(234,179,8,0.15)" />
            <Badge icon={EyeOff} label={`${counts.missing} faltantes`} color="var(--error)" tint="var(--error-tint)" />
          </div>

          {/* Nuevos */}
          <section className="bento p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                Productos nuevos ({counts.toCreate})
              </h2>
              {counts.toCreate > 0 && (
                <button onClick={toggleAllNew} className="text-xs font-medium" style={{ color: "var(--brand)" }}>
                  {allNewChecked ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              )}
            </div>
            {counts.toCreate === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>No hay productos nuevos en este Excel.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
                {(preview.toCreate || []).slice(0, RENDER_CAP).map((p) => (
                  <label key={p.code} className="flex items-center gap-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={newSelected.has(p.code)} onChange={() => toggleNew(p.code)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{p.nombre}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {p.code} · {money(p.priceARS)}{p.inStock === false ? " · Sin stock" : ""}
                      </p>
                    </div>
                  </label>
                ))}
                {(preview.toCreate || []).length > RENDER_CAP && (
                  <p className="text-xs py-2" style={{ color: "var(--muted)" }}>
                    …y {(preview.toCreate || []).length - RENDER_CAP} más (usá "Seleccionar todos").
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Actualizaciones */}
          <section className="bento p-5">
            <h2 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>Actualizaciones</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {counts.toUpdate} productos existentes van a actualizar precio/stock automáticamente.
              El nombre editado a mano no se toca.
            </p>
          </section>

          {/* Faltantes */}
          <section className="bento p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                No están en el Excel ({counts.missing})
              </h2>
              {counts.missing > 0 && (
                <div className="flex gap-1.5">
                  <MiniBtn onClick={() => setAllMissing("keep")}>Mantener todos</MiniBtn>
                  <MiniBtn onClick={() => setAllMissing("deactivate")}>Desactivar todos</MiniBtn>
                  <MiniBtn onClick={() => setAllMissing("delete")} danger>Eliminar todos</MiniBtn>
                </div>
              )}
            </div>
            {counts.missing === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Todos los productos activos están en el Excel.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
                {(preview.missing || []).slice(0, RENDER_CAP).map((m) => (
                  <div key={m.productCode} className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{m.name}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{m.productCode} · {money(m.priceARS)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <ActionBtn active={missingAction[m.productCode] === "keep"} onClick={() => setMissing(m.productCode, "keep")}>Mantener</ActionBtn>
                      <ActionBtn active={missingAction[m.productCode] === "deactivate"} onClick={() => setMissing(m.productCode, "deactivate")} tone="warn">Desactivar</ActionBtn>
                      <ActionBtn active={missingAction[m.productCode] === "delete"} onClick={() => setMissing(m.productCode, "delete")} tone="danger">Eliminar</ActionBtn>
                    </div>
                  </div>
                ))}
                {(preview.missing || []).length > RENDER_CAP && (
                  <p className="text-xs py-2" style={{ color: "var(--muted)" }}>
                    …y {(preview.missing || []).length - RENDER_CAP} más (usá los botones "…todos").
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Acciones */}
          <div className="flex items-center justify-between gap-2 pb-8">
            <button onClick={reset} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--surface2)", color: "var(--text)" }}>
              Cancelar
            </button>
            <button
              onClick={handleCommit}
              disabled={committing}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--brand)" }}
            >
              <Check size={16} /> {committing ? "Importando…" : "Confirmar importación"}
            </button>
          </div>
        </>
      )}

      {/* ── PASO 3: resultado ── */}
      {step === "result" && result && (
        <div className="bento p-6 space-y-4">
          <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>Importación completada</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <Stat label="Creados" value={result.created} icon={PlusCircle} />
            <Stat label="Actualizados" value={result.updated} icon={RefreshCw} />
            <Stat label="Eliminados" value={result.deleted} icon={Trash2} />
            <Stat label="Desactivados" value={result.deactivated} icon={EyeOff} />
            <Stat label="Omitidos" value={result.skipped} />
          </div>
          {result.errors?.length > 0 && (
            <div className="text-xs" style={{ color: "var(--error)" }}>
              {result.errors.length} filas con error. Ej: {result.errors.slice(0, 3).map((e) => `Fila ${e.fila ?? "?"}: ${e.motivo}`).join(" · ")}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => navigate("/admin/products")} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--brand)" }}>
              Ver productos
            </button>
            <button onClick={reset} className="px-4 py-2 rounded-xl text-sm" style={{ background: "var(--surface2)", color: "var(--text)" }}>
              Importar otro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ icon: Icon, label, color, tint }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: tint, color }}>
      {Icon && <Icon size={13} />} {label}
    </span>
  );
}

function MiniBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} className="text-xs font-medium px-2.5 py-1 rounded-lg"
      style={{ background: danger ? "var(--error-tint)" : "var(--surface2)", color: danger ? "var(--error)" : "var(--text)", border: "1px solid var(--border)" }}>
      {children}
    </button>
  );
}

function ActionBtn({ children, active, onClick, tone }) {
  const color = tone === "danger" ? "#DC2626" : tone === "warn" ? "#B45309" : "var(--brand)";
  return (
    <button onClick={onClick}
      className="text-xs font-medium px-2 py-1 rounded-lg transition-colors"
      style={active
        ? { background: color, color: "#fff" }
        : { background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
      {children}
    </button>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface2)" }}>
      {Icon && <Icon size={16} style={{ color: "var(--muted)", margin: "0 auto 4px" }} />}
      <p className="text-2xl font-black" style={{ color: "var(--brand)" }}>{value ?? 0}</p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>{label}</p>
    </div>
  );
}
