import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Banda promocional de un producto, hecha con la tipografía y los colores del
 * sitio (antes era un flyer subido como imagen, que desentonaba).
 * La imagen es solo la foto del producto: el fondo lo pone el componente.
 *
 * @param {string} label    - etiqueta chica, ej. "NUEVO INGRESO"
 * @param {string} title    - nombre del producto
 * @param {string} subtitle - bajada opcional
 * @param {string} image    - URL de la foto del producto (fondo transparente/limpio)
 * @param {string} href     - destino del CTA (ruta interna o URL externa)
 * @param {string} ctaText  - texto del botón
 */
export default function PromoBanner({
  label,
  title,
  subtitle,
  image,
  href,
  ctaText = "Ver producto",
}) {
  if (!title && !image) return null;

  const isExternal = /^https?:\/\//i.test(href || "");

  const cta = href && (
    <span
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
      style={{ color: "#001A80", minHeight: "44px" }}
    >
      {ctaText}
      <ArrowRight className="h-4 w-4" />
    </span>
  );

  const content = (
    <div
      className="relative overflow-hidden rounded-[20px] flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 px-6 py-7 sm:px-9 sm:py-8"
      style={{
        background: "linear-gradient(120deg, #0a46ff 0%, #0a2fb8 55%, var(--dark-card) 100%)",
      }}
    >
      {/* Halo suave detrás del producto */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-72 h-72 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 68%)" }}
      />

      <div className="relative flex-1 min-w-0">
        {label && (
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full mb-3 text-white/90 bg-white/15">
            {label}
          </span>
        )}
        <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h3>
        {subtitle && (
          <p className="text-sm mt-2 leading-relaxed text-white/70 max-w-md">{subtitle}</p>
        )}
        {cta && <div className="mt-5">{cta}</div>}
      </div>

      {image && (
        <div className="relative shrink-0 w-full sm:w-44 md:w-52">
          <img
            src={image}
            alt={title || "Producto destacado"}
            loading="lazy"
            decoding="async"
            className="w-full h-36 sm:h-44 md:h-52 object-contain"
            style={{ filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.35))" }}
          />
        </div>
      )}
    </div>
  );

  if (!href) return content;

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {content}
    </a>
  ) : (
    <Link to={href} className="block">
      {content}
    </Link>
  );
}
