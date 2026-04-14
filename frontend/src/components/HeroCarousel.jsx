import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import API from "../api/axios";

export default function HeroCarousel({ type = "home" }) {
  // Ref del autoplay para poder controlarlo manualmente
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));

  const [slides, setSlides] = useState([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    autoplay.current,
  ]);
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

  // Pausar autoplay al pasar el mouse
  const handleMouseEnter = useCallback(() => {
    autoplay.current.stop();
  }, []);

  // Reanudar autoplay al salir
  const handleMouseLeave = useCallback(() => {
    autoplay.current.play();
  }, []);

  // Reiniciar el autoplay cuando el usuario interactúa (manual reset)
  const resetAutoplay = useCallback(() => {
    autoplay.current.stop();
    autoplay.current.play();
  }, []);

  const scrollPrev = () => {
    if (!emblaApi) return;
    emblaApi.scrollPrev();
    resetAutoplay();
  };

  const scrollNext = () => {
    if (!emblaApi) return;
    emblaApi.scrollNext();
    resetAutoplay();
  };

  const scrollTo = (index) => {
    if (!emblaApi) return;
    emblaApi.scrollTo(index);
    resetAutoplay();
  };

  const computeDest = (s) => {
    if (s.targetCategory) {
      const cat = encodeURIComponent(s.targetCategory);
      const sub = s.targetSubcategory
        ? `&sub=${encodeURIComponent(s.targetSubcategory)}`
        : "";
      return `/catalogo?cat=${cat}${sub}`;
    }
    if (!s.linkUrl) return null;

    try {
      const url = new URL(s.linkUrl, window.location.origin);
      if (url.origin === window.location.origin) {
        return `${url.pathname}${url.search}${url.hash || ""}`;
      }
      return url.toString();
    } catch {
      return s.linkUrl;
    }
  };

  if (!slides.length) return null;

  return (
    <div
      className="w-full relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Viewport */}
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {slides.map((s, idx) => {
            const dest = computeDest(s);
            const isInternal = Boolean(dest && dest.startsWith("/"));

            const SlideInner = (
              <>
                <div style={{ aspectRatio: "3 / 1" }} className="w-full">
                  <img
                    src={s.image}
                    alt={s.title || `banner-${idx}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                {(s.title || s.subtitle) && (
                  <div className="absolute inset-0 bg-black/20 grid place-items-center p-4">
                    <div className="max-w-[980px] text-center text-white drop-shadow">
                      {s.title && (
                        <h3 className="text-lg sm:text-2xl md:text-4xl font-bold">
                          {s.title}
                        </h3>
                      )}
                      {s.subtitle && (
                        <p className="mt-2 text-sm sm:text-base md:text-lg">
                          {s.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            );

            return (
              <div
                key={s._id || idx}
                className="min-w-0 flex-[0_0_100%] relative"
              >
                {dest ? (
                  isInternal ? (
                    <Link to={dest} aria-label={s.title || "Ver más"}>
                      {SlideInner}
                    </Link>
                  ) : (
                    <a href={dest} aria-label={s.title || "Abrir"}>
                      {SlideInner}
                    </a>
                  )
                ) : (
                  SlideInner
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Flechas */}
      <button
        onClick={scrollPrev}
        aria-label="Anterior"
        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition"
      >
        ‹
      </button>
      <button
        onClick={scrollNext}
        aria-label="Siguiente"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition"
      >
        ›
      </button>

      {/* Bullets */}
      <div className="flex justify-center gap-2 mt-3">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir al slide ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={`h-2.5 w-2.5 rounded-full ${
              selected === i ? "bg-white" : "bg-white/50"
            } border border-white/70 shadow`}
          />
        ))}
      </div>
    </div>
  );
}
