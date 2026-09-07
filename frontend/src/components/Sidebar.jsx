import { useState, useEffect } from "react";
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

function CustomCheckbox({ checked }) {
  return (
    <div
      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
      style={{
        background: checked ? "var(--brand)" : "transparent",
        borderColor: checked ? "var(--brand)" : "var(--border)",
      }}
    >
      {checked && (
        <svg viewBox="0 0 10 10" width="8" height="8" fill="none">
          <path d="M1.5 5l2.5 2.5 5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );
}

function Sidebar({
  categories, selectedCategory, selectedSubcategory,
  onSelect,
  brands, selectedBrands, onBrandToggle,
  onClearAll, activeFilterCount, onClose,
}) {
  // Qué categoría está desplegada. Es independiente del filtro aplicado:
  // tocar una categoría abre sus subcategorías para elegir, no filtra todavía.
  // Arranca en la categoría activa para no perder el contexto al reabrir.
  const [expanded, setExpanded] = useState(selectedCategory);

  // El drawer mobile queda montado siempre (solo se desplaza), así que sin esto
  // no se abriría la categoría con la que se entró desde la home (?cat=...).
  useEffect(() => {
    if (selectedCategory && selectedCategory !== "all") setExpanded(selectedCategory);
  }, [selectedCategory]);

  const handleCategoryTap = (cat, subs) => {
    // Sin subcategorías no hay nada que elegir: filtra directo.
    if (!subs.length) {
      onSelect(cat, "all");
      return;
    }
    setExpanded((prev) => (prev === cat ? null : cat));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header drawer mobile */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-bold text-base" style={{ color: "var(--text)" }}>Filtros</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-[var(--surface2)]" style={{ color: "var(--muted)" }}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {activeFilterCount > 0 && (
          <button onClick={onClearAll}
            className="w-full text-xs text-left mb-2 flex items-center gap-1.5 transition-colors font-semibold px-1 py-1"
            style={{ color: "#DC2626" }}>
            <X className="h-3 w-3" /> Limpiar filtros ({activeFilterCount})
          </button>
        )}

        {/* Categorías */}
        <AccordionSection title="Categorías">
          <div className="space-y-0.5">
            <button
              onClick={() => onSelect("all", "all")}
              className="w-full text-left text-sm py-2 rounded-lg transition-all font-medium"
              style={{
                background: selectedCategory === "all" ? "var(--brand-tint)" : "transparent",
                color: selectedCategory === "all" ? "var(--brand)" : "var(--text)",
                borderLeft: selectedCategory === "all" ? "3px solid var(--brand)" : "3px solid transparent",
                paddingLeft: "10px",
              }}
            >
              Todas las categorías
            </button>
            {categories.map((c) => {
              const subs = c.subcategories || [];
              const isOpen = expanded === c.category;
              const isActive = selectedCategory === c.category;
              return (
                <div key={c.category}>
                  <button
                    onClick={() => handleCategoryTap(c.category, subs)}
                    aria-expanded={subs.length ? isOpen : undefined}
                    className="w-full flex items-center justify-between gap-2 text-left text-sm py-2 rounded-lg transition-all font-medium"
                    style={{
                      background: isActive ? "var(--brand-tint)" : "transparent",
                      color: isActive ? "var(--brand)" : "var(--text)",
                      borderLeft: isActive ? "3px solid var(--brand)" : "3px solid transparent",
                      paddingLeft: "10px",
                      paddingRight: "6px",
                    }}
                  >
                    <span className="min-w-0">{c.category}</span>
                    {subs.length > 0 && (
                      <ChevronDown
                        className="h-3.5 w-3.5 shrink-0 transition-transform"
                        style={{
                          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                          color: "var(--muted)",
                        }}
                      />
                    )}
                  </button>

                  {isOpen && subs.length > 0 && (
                    <div className="ml-3 mt-1 mb-2 space-y-0.5">
                      <button
                        onClick={() => onSelect(c.category, "all")}
                        className="w-full text-left text-xs px-2 py-2 rounded transition-colors"
                        style={{
                          color: isActive && selectedSubcategory === "all" ? "var(--brand)" : "var(--text2)",
                          fontWeight: isActive && selectedSubcategory === "all" ? 600 : 500,
                        }}
                      >
                        Ver todo en {c.category}
                      </button>
                      {[...subs].sort((a, b) => a.localeCompare(b)).map((s) => (
                        <button
                          key={s}
                          onClick={() => onSelect(c.category, s)}
                          className="w-full text-left text-xs px-2 py-2 rounded transition-colors"
                          style={{
                            color: isActive && selectedSubcategory === s ? "var(--brand)" : "var(--muted)",
                            fontWeight: isActive && selectedSubcategory === s ? 600 : 400,
                          }}
                        >
                          — {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AccordionSection>

        {/* Marcas */}
        {brands.length > 0 && (
          <AccordionSection title="Marcas">
            <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
              {brands.map((brand) => (
                <label key={brand}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-colors"
                  style={{ background: selectedBrands.includes(brand) ? "var(--brand-tint)" : "transparent" }}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => onBrandToggle(brand)}
                    className="sr-only"
                  />
                  <CustomCheckbox checked={selectedBrands.includes(brand)} />
                  <span className="text-sm" style={{ color: "var(--text)" }}>{brand}</span>
                </label>
              ))}
            </div>
          </AccordionSection>
        )}
      </div>

      {onClose && (
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="btn-primary w-full py-2.5 text-sm">
            Ver resultados
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
