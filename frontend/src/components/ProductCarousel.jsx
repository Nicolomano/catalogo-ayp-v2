import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import ProductCard from "./ProductCard.jsx";

/**
 * Fila deslizable de cards de producto (mobile-first).
 * En celular se ve una card entera + un asomo de la siguiente para invitar a deslizar;
 * en pantallas grandes muestra varias. Autoplay suave que se pausa al interactuar y
 * se desactiva si el usuario prefiere menos movimiento (prefers-reduced-motion).
 *
 * @param {Array} products - productos a mostrar
 */
export default function ProductCarousel({ products = [] }) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const autoplay = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const plugins = reduceMotion ? [] : [autoplay.current];
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: "start", loop: true, containScroll: "trimSnaps", dragFree: false },
    plugins
  );

  const [canScroll, setCanScroll] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScroll(emblaApi.canScrollPrev() || emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const resetAutoplay = useCallback(() => {
    if (reduceMotion) return;
    try { autoplay.current.stop(); autoplay.current.play(); } catch { /* noop */ }
  }, [reduceMotion]);

  const scrollPrev = () => { if (emblaApi) { emblaApi.scrollPrev(); resetAutoplay(); } };
  const scrollNext = () => { if (emblaApi) { emblaApi.scrollNext(); resetAutoplay(); } };

  if (!products.length) return null;

  return (
    <div className="relative group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {products.map((p) => (
            <div
              key={p._id}
              className="min-w-0 flex-[0_0_72%] sm:flex-[0_0_46%] lg:flex-[0_0_31%] xl:flex-[0_0_23%] pr-3 sm:pr-4"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>

      {canScroll && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Anterior"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full items-center justify-center backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={scrollNext}
            aria-label="Siguiente"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full items-center justify-center backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
