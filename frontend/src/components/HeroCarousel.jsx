import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import API from "../api/axios";

/**
 * @param {string}   type          - "home" | "catalog"  (solo se usa si no se pasan slides)
 * @param {Array}    slides        - Si se pasan desde el padre, no se hace fetch interno
 * @param {boolean}  fillContainer - true: llena el contenedor padre (alto fijo)
 *                                   false: usa aspect-ratio propio (2:1 móvil / 3:1 desktop)
 */
export default function HeroCarousel({ type = "home", slides: slidesProp, fillContainer = false }) {
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  const [slides, setSlides]       = useState(Array.isArray(slidesProp) ? slidesProp : []);
  const [emblaRef, emblaApi]      = useEmblaCarousel({ loop: true }, [autoplay.current]);
  const [selected, setSelected]   = useState(0);

  // Solo hace fetch si no recibió slides como prop
  useEffect(() => {
    if (slidesProp !== undefined) {
      setSlides(Array.isArray(slidesProp) ? slidesProp : []);
      return;
    }
    API.get(`/banners?type=${type}`)
      .then((res) => setSlides(Array.isArray(res.data) ? res.data : []))
      .catch((e) => console.error("Error cargando banners:", e));
  }, [type, slidesProp]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  const handleMouseEnter = useCallback(() => autoplay.current.stop(), []);
  const handleMouseLeave = useCallback(() => autoplay.current.play(), []);

  const resetAutoplay = useCallback(() => {
    autoplay.current.stop();
    autoplay.current.play();
  }, []);

  const scrollPrev = () => { if (emblaApi) { emblaApi.scrollPrev(); resetAutoplay(); } };
  const scrollNext = () => { if (emblaApi) { emblaApi.scrollNext(); resetAutoplay(); } };
  const scrollTo   = (i) => { if (emblaApi) { emblaApi.scrollTo(i);  resetAutoplay(); } };

  const computeDest = (s) => {
    if (s.targetCategory) {
      const cat = encodeURIComponent(s.targetCategory);
      const sub = s.targetSubcategory ? `&sub=${encodeURIComponent(s.targetSubcategory)}` : "";
      return `/catalogo?cat=${cat}${sub}`;
    }
    if (!s.linkUrl) return null;
    try {
      const url = new URL(s.linkUrl, window.location.origin);
      return url.origin === window.location.origin
        ? `${url.pathname}${url.search}${url.hash || ""}`
        : url.toString();
    } catch { return s.linkUrl; }
  };

  if (!slides.length) return null;

  return (
    <div
      className={`relative group ${fillContainer ? "h-full" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Viewport */}
      <div
        className={`overflow-hidden ${fillContainer ? "h-full rounded-[20px]" : "rounded-2xl shadow-md"}`}
        ref={emblaRef}
      >
        <div className={`flex ${fillContainer ? "h-full" : ""}`}>
          {slides.map((s, idx) => {
            const dest       = computeDest(s);
            const isInternal = Boolean(dest && dest.startsWith("/"));

            const inner = (
              <div
                className={`w-full relative overflow-hidden ${
                  fillContainer
                    ? "h-full"
                    : "aspect-[2/1] md:aspect-[3/1]"
                }`}
              >
                <img
                  src={s.image}
                  alt={s.title || `banner-${idx}`}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                />

                {/* Overlay de texto */}
                {(s.title || s.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent flex items-end p-3 sm:p-4">
                    <div className="text-white drop-shadow-lg">
                      {s.title && (
                        <p className={`font-bold leading-tight ${fillContainer ? "text-sm sm:text-base" : "text-base sm:text-xl md:text-2xl"}`}>
                          {s.title}
                        </p>
                      )}
                      {s.subtitle && (
                        <p className="mt-0.5 text-xs opacity-85 line-clamp-2">
                          {s.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bullets */}
                {slides.length > 1 && (
                  <div className="absolute bottom-2 right-2.5 flex gap-1.5 items-center">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Slide ${i + 1}`}
                        onClick={(e) => { e.preventDefault(); scrollTo(i); }}
                        className={`rounded-full transition-all duration-300 cursor-pointer hover:opacity-100 ${
                          selected === i ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <div
                key={s._id || idx}
                className={`min-w-0 flex-[0_0_100%] ${fillContainer ? "h-full" : ""}`}
              >
                {dest
                  ? isInternal
                    ? <Link to={dest} className={fillContainer ? "block h-full" : ""} aria-label={s.title || "Ver más"}>{inner}</Link>
                    : <a href={dest} target="_blank" rel="noopener noreferrer" className={fillContainer ? "block h-full" : ""} aria-label={s.title || "Abrir"}>{inner}</a>
                  : inner
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Flechas */}
      {slides.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/60"
          ><ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /></button>
          <button
            onClick={scrollNext}
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-black/60"
          ><ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" /></button>
        </>
      )}
    </div>
  );
}
