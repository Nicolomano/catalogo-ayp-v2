import { useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

function AccordionSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-xs font-bold uppercase tracking-wider transition-colors"
        style={{ color: open ? "var(--brand)" : "var(--muted)" }}
      >
        {title}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function Sidebar({
  categories, selectedCategory, selectedSubcategory,
  onCategoryChange, onSubcategoryChange,
  brands, selectedBrands, onBrandToggle,
  onClearAll, activeFilterCount, onClose,
}) {
  const selectedCatData = categories.find((c) => c.category === selectedCategory);
  const subcategories   = selectedCatData?.subcategories || [];

  const catBtnCls = (active) =>
    `w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors font-medium`;

  return (
    <div className="flex flex-col h-full">
      {/* Header drawer mobile */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>Filtros</h2>
          <button onClick={onClose} style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {activeFilterCount > 0 && (
          <button onClick={onClearAll}
            className="w-full text-xs text-left mb-2 flex items-center gap-1 transition-colors"
            style={{ color: "#DC2626" }}>
            <X className="h-3 w-3" /> Limpiar filtros ({activeFilterCount})
          </button>
        )}

        {/* Categorías */}
        <AccordionSection title="Categorías">
          <div className="space-y-0.5">
            <button
              onClick={() => onCategoryChange("all")}
              className={catBtnCls(selectedCategory === "all")}
              style={{
                background: selectedCategory === "all" ? "var(--brand)" : "transparent",
                color: selectedCategory === "all" ? "white" : "var(--text)",
              }}
            >
              Todas las categorías
            </button>
            {categories.map((c) => (
              <div key={c.category}>
                <button
                  onClick={() => onCategoryChange(c.category)}
                  className={catBtnCls(selectedCategory === c.category)}
                  style={{
                    background: selectedCategory === c.category ? "var(--brand)" : "transparent",
                    color: selectedCategory === c.category ? "white" : "var(--text)",
                  }}
                >
                  {c.category}
                </button>
                {selectedCategory === c.category && subcategories.length > 0 && (
                  <div className="ml-3 mt-1 space-y-0.5">
                    <button onClick={() => onSubcategoryChange("all")}
                      className="w-full text-left text-xs px-2 py-1 rounded transition-colors"
                      style={{ color: selectedSubcategory === "all" ? "var(--brand)" : "var(--muted)", fontWeight: selectedSubcategory === "all" ? 600 : 400 }}>
                      — Todas
                    </button>
                    {subcategories.map((s) => (
                      <button key={s} onClick={() => onSubcategoryChange(s)}
                        className="w-full text-left text-xs px-2 py-1 rounded transition-colors"
                        style={{ color: selectedSubcategory === s ? "var(--brand)" : "var(--muted)", fontWeight: selectedSubcategory === s ? 600 : 400 }}>
                        — {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* Marcas */}
        {brands.length > 0 && (
          <AccordionSection title="Marcas">
            <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
              {brands.map((brand) => (
                <label key={brand}
                  className="flex items-center gap-2 px-1 py-1.5 rounded-lg cursor-pointer transition-colors"
                  style={{ background: selectedBrands.includes(brand) ? "var(--brand-tint)" : "transparent" }}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => onBrandToggle(brand)}
                    className="rounded"
                    style={{ accentColor: "var(--brand)" }}
                  />
                  <span className="text-sm" style={{ color: "var(--text)" }}>{brand}</span>
                </label>
              ))}
            </div>
          </AccordionSection>
        )}
      </div>

      {onClose && (
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose}
            className="w-full text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
            style={{ background: "var(--brand)" }}>
            Ver resultados
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
