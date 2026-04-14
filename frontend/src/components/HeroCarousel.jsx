import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import API from "../api/axios";

export default function HeroCarousel({ type = "home" }) {
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  const [slides, setSlides] = useState([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [autoplay.current]);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    API.get(`/banners?type=${type}`)
      .then((res) => setSlides(res.data || []))
      .catch((e) => console.error("Error cargando banners:", e));
  }, [type]);

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
  const scrollTo   = (i) => { if (emblaApi) { emblaApi.scrollTo(i); resetAutoplay(); } };

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
    } catch {
      return s.linkUrl;
    }
  };

  if (!slides.length) return null;

  return (
    <div
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Viewport */}
      <div className="overflow-hidden rounded-2xl shadow-md" ref={emblaRef}>
        <div className="flex">
          {slides.map((s, idx) => {
            const dest       = computeDest(s);
            const isInternal = Boolean(dest && dest.startsWith("/"));

            /* El contenido de cada slide */
            const inner = (
              /* Aspect ratio: 2:1 en móvil → más alto y cómodo para pulgar
                               3:1 en desktop → banner panorámico clásico      */
              <div className="w-full aspect-[2/1] md:aspect-[3/1] relative overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title || `banner-${idx}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                />

                {/* Overlay de texto */}
                {(s.title || s.subtitle) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent flex items-end p-4 sm:p-6">
                    <div className="text-white drop-shadow-lg max-w-lg">
                      {s.title && (
                        <p className="text-base sm:text-xl md:text-2xl font-bold leading-tight">
                          {s.title}
                        </p>
                      )}
                      {s.subtitle && (
                        <p className="mt-1 text-xs sm:text-sm opacity-85 line-clamp-2">
                          {s.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bullets dentro de la imagen */}
                {slides.length > 1 && (
                  <div className="absolute bottom-2.5 right-3 flex gap-1.5 items-center">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Slide ${i + 1}`}
                        onClick={(e) => { e.preventDefault(); scrollTo(i); }}
                        className={`rounded-full transition-all duration-300 ${
                          selected === i
                            ? "w-4 h-1.5 bg-white"
                            : "w-1.5 h-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );

            return (
              <div key={s._id || idx} className="min-w-0 flex-[0_0_100%]">
                {dest
                  ? isInternal
                    ? <Link to={dest} aria-label={s.title || "Ver más"}>{inner}</Link>
                    : <a href={dest} target="_blank" rel="noopener noreferrer" aria-label={s.title || "Abrir"}>{inner}</a>
                  : inner
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Flechas — siempre visibles en móvil, solo en hover en desktop */}
      {slides.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm text-xl leading-none md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            ‹
          </button>
          <button
            onClick={scrollNext}
            aria-label="Siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm text-xl leading-none md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
