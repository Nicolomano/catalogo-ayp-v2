import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapPin, Star, ChevronDown, UserCheck } from "lucide-react";
import API from "../api/axios";

const LIMIT = 6;

const SPECIALTY_DEFAULTS = ["Aires", "Heladeras", "Cámaras", "Lavarropas"];
const ZONE_DEFAULTS      = ["GBA", "CABA", "Zona Norte"];

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
      style={{
        background: active ? "var(--brand)" : "var(--surface2)",
        color:      active ? "#fff"         : "var(--muted)",
        border:     `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`,
      }}
    >
      {label}
    </button>
  );
}

function TecnicoCard({ tecnico }) {
  const waText = encodeURIComponent(
    `Hola! Los contacto desde el sitio de A&P Refrigeración. Me interesa conocer más sobre sus servicios.`
  );
  const waLink = tecnico.whatsapp
    ? `https://wa.me/${tecnico.whatsapp.replace(/\D/g, "")}?text=${waText}`
    : null;

  return (
    <div className="bento flex flex-col overflow-hidden">
      {/* Foto */}
      <div className="relative" style={{ aspectRatio: "4/3", background: "var(--surface2)" }}>
        {tecnico.photo ? (
          <img
            src={tecnico.photo}
            alt={tecnico.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UserCheck className="h-14 w-14 opacity-20" style={{ color: "var(--muted)" }} />
          </div>
        )}
        {tecnico.recommended && (
          <span
            className="absolute top-2.5 left-2.5 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <UserCheck className="h-3 w-3" /> Recomendado A&P
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-bold text-base leading-tight" style={{ color: "var(--text)" }}>
            {tecnico.title ? `${tecnico.title} ` : ""}{tecnico.name}
          </h3>
          {(tecnico.city || tecnico.neighborhood) && (
            <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {[tecnico.city, tecnico.neighborhood].filter(Boolean).join(", ")}
            </p>
          )}
          {tecnico.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                {tecnico.rating.toFixed(1)}
              </span>
              {tecnico.reviewCount > 0 && (
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  ({tecnico.reviewCount} reseñas)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Especialidades */}
        {tecnico.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tecnico.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Trabajos recientes */}
        {tecnico.recentWork?.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>
              Trabajos recientes
            </p>
            <div className="grid grid-cols-3 gap-1">
              {tecnico.recentWork.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden"
                  style={{ aspectRatio: "1", background: "var(--surface2)" }}
                >
                  <img
                    src={url}
                    alt={`Trabajo ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="mt-auto flex gap-2">
          <Link
            to={`/tecnicos/${tecnico._id}`}
            className="flex-1 text-center py-2 rounded-xl text-sm font-medium transition-all border"
            style={{ color: "var(--brand)", borderColor: "var(--brand-tint)", background: "var(--brand-tint)" }}
          >
            Ver perfil
          </Link>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white text-center transition-opacity hover:opacity-90"
              style={{ background: "#25D366" }}
            >
              Contactar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function TecnicoCardSkeleton() {
  return (
    <div className="bento overflow-hidden">
      <div className="skeleton skeleton-image" style={{ aspectRatio: "4/3" }} />
      <div className="p-4 space-y-3">
        <div>
          <div className="skeleton skeleton-title w-2/3" />
          <div className="skeleton skeleton-text w-1/2 mt-1" />
        </div>
        <div className="flex gap-1.5">
          <div className="skeleton h-5 w-14 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton skeleton-btn flex-1 rounded-xl" />
          <div className="skeleton skeleton-btn flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function Tecnicos() {
  const [tecnicos, setTecnicos]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [zones, setZones]         = useState(ZONE_DEFAULTS);
  const [specialties, setSpecialties] = useState(SPECIALTY_DEFAULTS);
  const [zona, setZona]           = useState("");
  const [especialidad, setEspecialidad] = useState("");

  useEffect(() => {
    API.get("/tecnicos/filters")
      .then((r) => {
        if (r.data.zones?.length)      setZones(r.data.zones);
        if (r.data.specialties?.length) setSpecialties(r.data.specialties);
      })
      .catch(() => {});
  }, []);

  const fetchTecnicos = useCallback(async (reset = true) => {
    const p = reset ? 1 : page + 1;
    if (reset) { setLoading(true); setTecnicos([]); }
    else         setLoadingMore(true);

    try {
      const params = { page: p, limit: LIMIT };
      if (zona)        params.zona = zona;
      if (especialidad) params.especialidad = especialidad;
      const res = await API.get("/tecnicos", { params });
      const incoming = res.data.tecnicos || [];
      setTecnicos((prev) => reset ? incoming : [...prev, ...incoming]);
      setTotal(res.data.total || 0);
      if (!reset) setPage(p);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [zona, especialidad, page]);

  useEffect(() => {
    setPage(1);
    fetchTecnicos(true);
  }, [zona, especialidad]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = tecnicos.length < total;

  return (
    <>
      <Helmet>
        <title>Instaladores Recomendados — A&P Refrigeración</title>
        <meta name="description" content="Profesionales independientes recomendados por A&P Refrigeración para instalación y mantenimiento de equipos de refrigeración." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Breadcrumb */}
        <nav className="text-xs" style={{ color: "var(--muted)" }}>
          <Link to="/" className="hover:underline" style={{ color: "var(--brand)" }}>Inicio</Link>
          <span className="mx-1.5">›</span>
          <span>Instaladores Recomendados</span>
        </nav>

        {/* Encabezado */}
        <div>
          <span
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-3"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            Directorio
          </span>
          <h1 className="text-3xl font-black" style={{ color: "var(--text)", letterSpacing: "var(--tracking-display)" }}>
            Instaladores Recomendados
          </h1>
          <p className="text-sm mt-1 max-w-lg" style={{ color: "var(--muted)" }}>
            Profesionales independientes que compran en A&P y cuentan con nuestro aval para tus reparaciones e instalaciones.
          </p>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold mr-1" style={{ color: "var(--muted)" }}>
              <MapPin className="h-3.5 w-3.5" /> Zonas:
            </div>
            <FilterPill label="Todas" active={!zona} onClick={() => setZona("")} />
            {zones.map((z) => (
              <FilterPill key={z} label={z} active={zona === z} onClick={() => setZona(z === zona ? "" : z)} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold mr-1" style={{ color: "var(--muted)" }}>
              <UserCheck className="h-3.5 w-3.5" /> Especialidad:
            </div>
            <FilterPill label="Todas" active={!especialidad} onClick={() => setEspecialidad("")} />
            {specialties.map((s) => (
              <FilterPill key={s} label={s} active={especialidad === s} onClick={() => setEspecialidad(s === especialidad ? "" : s)} />
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <TecnicoCardSkeleton key={i} />)}
          </div>
        ) : tecnicos.length === 0 ? (
          <div className="bento p-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-20" style={{ color: "var(--muted)" }} />
            <p className="font-bold" style={{ color: "var(--text)" }}>No hay instaladores disponibles</p>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Probá con otros filtros</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tecnicos.map((t) => <TecnicoCard key={t._id} tecnico={t} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={() => fetchTecnicos(false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all border"
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? (
                    <>
                      <span className="dot-loader" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ver más instaladores
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
