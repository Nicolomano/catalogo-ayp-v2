import { useEffect, useState, useCallback, useRef } from "react";
import API, { getFresco } from "../api/axios";
import toast from "react-hot-toast";
import { Package, PlusCircle, Trash2, Search, X, AlertTriangle, Pencil } from "lucide-react";
import { useConfirm } from "../Context/ConfirmContext.jsx";
import { formatTitle } from "../utils/text.js";

const inputCls =
  "w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 transition-colors";
const inputStyle = {
  background: "var(--surface2)",
  borderColor: "var(--border)",
  color: "var(--text)",
};

const VACIO = {
  _id: null,
  name: "",
  productCode: "",
  description: "",
  categoria: "",
  image: null,
  imageFile: null,
  componentes: [],
};

const pesos = (n) =>
  typeof n === "number" ? `$${n.toLocaleString("es-AR")}` : "—";

/**
 * Combos: productos armados con otros productos.
 *
 * El precio no se escribe acá y no se puede escribir: sale de la suma de las
 * piezas, con los precios del momento (Backend/src/utils/combos.js). Mientras se
 * arma, el servidor lo cotiza para poder mostrarlo en vivo, así se ve cuánto va
 * a salir antes de publicarlo.
 */
export default function AdminCombos() {
  const confirm = useConfirm();

  const [combos, setCombos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState(VACIO);
  const [abierto, setAbierto] = useState(false);

  // Buscador de piezas
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // Lo que el servidor dice que va a salir con las piezas elegidas
  const [cotizacion, setCotizacion] = useState(null);
  const pedidoDeCotizacion = useRef(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, cats] = await Promise.all([
        getFresco("/products/combos/list"),
        getFresco("/categories/tree").catch(() => ({ data: [] })),
      ]);
      setCombos(c.data?.combos || []);
      setCategorias((cats.data || []).map((x) => x.name).filter(Boolean));
    } catch {
      toast.error("No se pudieron cargar los combos");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /* ── Buscador de piezas ─────────────────────────────────────────── */
  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const t = setTimeout(() => {
      API.get(`/products/admin/all?search=${encodeURIComponent(termino)}&limit=10`)
        .then((res) => setResultados(res.data?.products || []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false));
    }, 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  /* ── El precio en vivo ──────────────────────────────────────────── */
  useEffect(() => {
    if (form.componentes.length < 2) {
      setCotizacion(null);
      return;
    }
    const mio = ++pedidoDeCotizacion.current;
    const t = setTimeout(() => {
      API.post("/products/combos/cotizar", {
        productCode: form.productCode,
        componentes: form.componentes.map((c) => ({
          productCode: c.productCode,
          quantity: c.quantity,
        })),
      })
        .then((res) => {
          // Si mientras volvía esta respuesta se cambiaron las piezas, se
          // descarta: mostrar un precio que no es el de lo que está en pantalla
          // sería peor que no mostrar ninguno.
          if (mio === pedidoDeCotizacion.current) setCotizacion(res.data);
        })
        .catch((err) => {
          if (mio === pedidoDeCotizacion.current) {
            setCotizacion({ error: err.response?.data?.message || "No se pudo calcular" });
          }
        });
    }, 300);
    return () => clearTimeout(t);
  }, [form.componentes, form.productCode]);

  /* ── Armado ─────────────────────────────────────────────────────── */
  const agregarPieza = (p) => {
    if (p.componentes?.length) {
      return toast.error("Ese producto ya es un combo. No se puede poner un combo adentro de otro.");
    }
    if (form.componentes.some((c) => c.productCode === p.productCode)) {
      return toast("Esa pieza ya está. Cambiale la cantidad.", { icon: "ℹ️" });
    }
    setForm((f) => ({
      ...f,
      componentes: [
        ...f.componentes,
        { productCode: p.productCode, name: p.name, priceARS: p.priceARS, inStock: p.inStock, quantity: 1 },
      ],
    }));
    setBusqueda("");
    setResultados([]);
  };

  const cambiarCantidad = (productCode, quantity) => {
    if (quantity < 1) return;
    setForm((f) => ({
      ...f,
      componentes: f.componentes.map((c) =>
        c.productCode === productCode ? { ...c, quantity } : c
      ),
    }));
  };

  const quitarPieza = (productCode) =>
    setForm((f) => ({
      ...f,
      componentes: f.componentes.filter((c) => c.productCode !== productCode),
    }));

  const abrirNuevo = () => {
    setForm(VACIO);
    setCotizacion(null);
    setAbierto(true);
  };

  const abrirEdicion = (combo) => {
    setForm({
      _id: combo._id,
      name: combo.name || "",
      productCode: combo.productCode || "",
      description: combo.description || "",
      categoria: combo.categories?.[0] || "",
      image: combo.image || null,
      imageFile: null,
      componentes: (combo.componentesDetalle || []).map((c) => ({
        productCode: c.productCode,
        name: c.name,
        quantity: c.quantity,
        inStock: c.inStock,
      })),
    });
    setCotizacion(null);
    setAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Ponele un nombre al combo");
    if (!form.productCode.trim()) return toast.error("Falta el código del combo");
    if (form.componentes.length < 2) return toast.error("El combo tiene que tener al menos 2 productos");

    setGuardando(true);
    try {
      // La foto se sube primero y va como URL: el endpoint del combo recibe
      // JSON, porque la lista de piezas no entra cómoda en un formulario.
      let image = form.image;
      if (form.imageFile) {
        const fd = new FormData();
        fd.append("image", form.imageFile);
        const up = await API.post("/products/upload", fd);
        image = up.data?.imageUrl || image;
      }

      const cuerpo = {
        name: form.name.trim(),
        productCode: form.productCode.trim(),
        description: form.description.trim(),
        image,
        categories: form.categoria ? [form.categoria] : [],
        componentes: form.componentes.map((c) => ({
          productCode: c.productCode,
          quantity: c.quantity,
        })),
      };

      if (form._id) await API.put(`/products/combos/${form._id}`, cuerpo);
      else await API.post("/products/combos", cuerpo);

      toast.success(form._id ? "Combo actualizado" : "Combo creado");
      setAbierto(false);
      setForm(VACIO);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo guardar el combo");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (combo) => {
    if (
      !(await confirm({
        title: "Eliminar combo",
        message: `¿Eliminar "${combo.name}"? Los productos que lo componen no se tocan.`,
        confirmText: "Eliminar",
        tone: "danger",
      }))
    )
      return;
    try {
      await API.delete(`/products/${combo._id}`);
      toast.success("Combo eliminado");
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo eliminar");
    }
  };

  const alternarActivo = async (combo) => {
    try {
      await API.patch(`/products/${combo._id}/toggle`);
      cargar();
    } catch {
      toast.error("No se pudo cambiar la publicación");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>
            Combos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            Productos armados con otros productos. Aparecen en el catálogo como uno más, y el
            precio es la suma de sus piezas con los precios del día: no hay que actualizarlo
            a mano después de importar el Excel.
          </p>
        </div>
        {!abierto && (
          <button onClick={abrirNuevo} className="btn-primary text-sm shrink-0 flex items-center gap-1.5">
            <PlusCircle size={16} /> Nuevo combo
          </button>
        )}
      </div>

      {/* ── Formulario ──────────────────────────────────────────── */}
      {abierto && (
        <form onSubmit={guardar} className="bento p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {form._id ? "Editar combo" : "Nuevo combo"}
            </h2>
            <button
              type="button"
              onClick={() => { setAbierto(false); setForm(VACIO); }}
              className="p-1 rounded-lg"
              style={{ color: "var(--muted)" }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre (ej: Combo instalación split 3500W)"
              className={inputCls}
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Código (ej: COMBO-001)"
              className={inputCls}
              style={inputStyle}
              value={form.productCode}
              disabled={Boolean(form._id)}
              onChange={(e) => setForm({ ...form, productCode: e.target.value })}
            />
          </div>

          <textarea
            placeholder="Descripción (opcional: para qué sirve el combo)"
            rows={2}
            className={inputCls}
            style={inputStyle}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              className={inputCls}
              style={inputStyle}
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              {form.image && !form.imageFile && (
                <img src={form.image} alt="" className="h-10 w-10 object-contain rounded-lg" />
              )}
              <input
                type="file"
                accept="image/*"
                className="text-xs flex-1"
                style={{ color: "var(--muted)" }}
                onChange={(e) => setForm({ ...form, imageFile: e.target.files?.[0] || null })}
              />
            </div>
          </div>

          {/* ── Las piezas ──────────────────────────────────── */}
          <div className="rounded-2xl p-4" style={{ background: "var(--surface2)" }}>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
              Qué incluye
            </p>

            {form.componentes.length === 0 ? (
              <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
                Buscá los productos abajo y agregalos. Hacen falta al menos dos.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {form.componentes.map((c) => (
                  <li key={c.productCode} className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(c.productCode, c.quantity - 1)}
                        className="w-7 h-7 rounded-lg font-bold"
                        style={{ background: "var(--surface)", color: "var(--brand)" }}
                      >
                        −
                      </button>
                      <span className="w-7 text-center font-bold text-sm" style={{ color: "var(--brand)" }}>
                        {c.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(c.productCode, c.quantity + 1)}
                        className="w-7 h-7 rounded-lg font-bold"
                        style={{ background: "var(--surface)", color: "var(--brand)" }}
                      >
                        +
                      </button>
                    </div>
                    <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--text)" }}>
                      {formatTitle(c.name)}
                      {c.inStock === false && (
                        <span className="ml-1.5 text-xs font-semibold" style={{ color: "#DC2626" }}>
                          sin stock
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                      {c.productCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarPieza(c.productCode)}
                      className="p-1 rounded-lg"
                      style={{ color: "#DC2626" }}
                      title="Quitar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted)" }}
              />
              <input
                type="text"
                placeholder="Buscar un producto por nombre o código"
                className={inputCls + " pl-9"}
                style={inputStyle}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            {buscando && (
              <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Buscando…</p>
            )}
            {resultados.length > 0 && (
              <ul className="mt-2 space-y-1 max-h-56 overflow-y-auto">
                {resultados.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => agregarPieza(p)}
                      className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition-colors hover:brightness-95"
                      style={{ background: "var(--surface)" }}
                    >
                      <span className="flex-1 min-w-0 text-sm truncate" style={{ color: "var(--text)" }}>
                        {formatTitle(p.name)}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                        {p.productCode}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
                        {pesos(p.priceARS)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Lo que va a salir ───────────────────────────── */}
          <div
            className="rounded-2xl p-4 flex items-center justify-between gap-4"
            style={{ background: "var(--brand-tint)" }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Precio del combo
              </p>
              {cotizacion?.error ? (
                <p className="text-sm font-semibold mt-1" style={{ color: "#DC2626" }}>
                  {cotizacion.error}
                </p>
              ) : cotizacion ? (
                <>
                  <p className="text-2xl font-black" style={{ color: "var(--brand)" }}>
                    {pesos(cotizacion.priceARS)}
                  </p>
                  {cotizacion.inStock === false && (
                    <p className="text-xs font-semibold mt-0.5 flex items-center gap-1" style={{ color: "#DC2626" }}>
                      <AlertTriangle size={13} />
                      Se va a publicar sin stock: falta {cotizacion.faltan?.join(", ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                  Agregá al menos dos productos
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={guardando || !cotizacion || Boolean(cotizacion?.error)}
              className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {guardando ? "Guardando…" : form._id ? "Guardar cambios" : "Crear combo"}
            </button>
          </div>
        </form>
      )}

      {/* ── Los combos que ya están ─────────────────────────────── */}
      {cargando ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Cargando…</p>
      ) : combos.length === 0 ? (
        <div className="bento p-8 text-center">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" style={{ color: "var(--muted)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Todavía no hay combos
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Un combo junta varios productos en uno, para que el cliente no tenga que buscarlos de a uno.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {combos.map((c) => (
            <div key={c._id} className="bento p-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: "var(--surface2)" }}
                >
                  {c.image ? (
                    <img src={c.image} alt="" className="object-contain max-h-full" />
                  ) : (
                    <Package className="h-6 w-6 opacity-20" style={{ color: "var(--muted)" }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    {formatTitle(c.name)}
                  </p>
                  <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                    {c.productCode} · {c.componentes?.length || 0} productos
                  </p>
                  <p className="text-base font-bold mt-1" style={{ color: "var(--brand)" }}>
                    {pesos(c.priceARS)}
                  </p>
                  {c.incompleto && (
                    <p className="text-xs font-semibold mt-1 flex items-center gap-1" style={{ color: "#DC2626" }}>
                      <AlertTriangle size={13} />
                      Le falta una pieza del catálogo: revisalo
                    </p>
                  )}
                  {!c.incompleto && c.inStock === false && (
                    <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                      Sin stock: falta {c.faltan?.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button
                    onClick={() => alternarActivo(c)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={
                      c.active
                        ? { background: "#F0FDF4", color: "#15803D" }
                        : { background: "var(--surface2)", color: "var(--muted)" }
                    }
                    title="Publicar o despublicar"
                  >
                    {c.active ? "Publicado" : "Oculto"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirEdicion(c)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "var(--brand)" }}
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => borrar(c)}
                      className="p-1.5 rounded-lg"
                      style={{ color: "#DC2626" }}
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {c.componentesDetalle?.length > 0 && (
                <ul className="mt-3 ml-3 pl-3" style={{ borderLeft: "2px solid var(--border)" }}>
                  {c.componentesDetalle.map((p) => (
                    <li key={p.productCode} className="text-xs flex gap-2" style={{ color: "var(--muted)" }}>
                      <span className="font-semibold">{p.quantity}×</span>
                      <span className="flex-1 truncate">{formatTitle(p.name)}</span>
                      {!p.inStock && (
                        <span className="font-semibold" style={{ color: "#DC2626" }}>sin stock</span>
                      )}
                      <span className="font-mono">{p.productCode}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
