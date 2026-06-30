import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  MapPin, Star, ChevronLeft, UserCheck, Clock,
  Wrench, Thermometer, Zap, Wind, Package, Settings,
  Shield, Snowflake,
} from "lucide-react";
import API from "../api/axios";

// Map icon name strings to Lucide components
const ICON_MAP = {
  Wrench:      Wrench,
  Thermometer: Thermometer,
  Zap:         Zap,
  Wind:        Wind,
  Package:     Package,
  Settings:    Settings,
  Shield:      Shield,
  Snowflake:   Snowflake,
  UserCheck:   UserCheck,
  Clock:       Clock,
};

function ServiceIcon({ name }) {
  const Icon = ICON_MAP[name] || Wrench;
  return <Icon className="h-4 w-4 flex-shrink-0" />;
}

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="h-4 w-4"
          style={{
            fill:  i <= Math.round(value) ? "#FBBF24" : "transparent",
            color: i <= Math.round(value) ? "#FBBF24" : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="skeleton h-4 w-32 rounded mb-6" />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="skeleton skeleton-image rounded-2xl" style={{ aspectRatio: "1" }} />
          <div className="skeleton skeleton-title w-3/4" />
          <div className="skeleton skeleton-text w-1/2" />
          <div className="skeleton skeleton-btn rounded-xl" />
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="bento p-6 space-y-2">
            <div className="skeleton skeleton-title w-1/3" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text w-5/6" />
            <div className="skeleton skeleton-text w-4/6" />
          </div>
          <div className="bento p-6">
            <div className="skeleton skeleton-title w-1/3 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TecnicoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tecnico, setTecnico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    setLoading(true);
    API.get(`/tecnicos/${id}`)
      .then((r) => setTecnico(r.data))
      .catch(() => navigate("/tecnicos", { replace: true }))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <DetailSkeleton />;
  if (!tecnico) return null;

  const waText = encodeURIComponent(
    `Hola ${tecnico.name}! Los contacto desde el sitio de A&P Refrigeración. Me interesa conocer más sobre sus servicios.`
  );
  const waLink = tecnico.whatsapp
    ? `https://wa.me/${tecnico.whatsapp.replace(/\D/g, "")}?text=${waText}`
    : null;

  return (
    <>
      <Helmet>
        <title>{`${tecnico.title ? tecnico.title + " " : ""}${tecnico.name} — Instaladores A&P`}</title>
        <meta name="description" content={tecnico.bio?.slice(0, 160) || "Instalador recomendado por A&P Refrigeración"} />
      </Helmet>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={tecnico.recentWork[lightbox]}
            alt={`Trabajo ${lightbox + 1}`}
            className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Breadcrumb / back */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/tecnicos"
            className="flex items-center gap-1 font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--brand)" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Instaladores
          </Link>
          <span style={{ color: "var(--border)" }}>›</span>
          <span style={{ color: "var(--muted)" }}>Perfil</span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* ── Col izquierda ── */}
          <div className="space-y-4">
            {/* Foto */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ aspectRatio: "1", background: "var(--surface2)" }}
            >
              {tecnico.photo ? (
                <img
                  src={tecnico.photo}
                  alt={tecnico.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserCheck className="h-16 w-16 opacity-15" style={{ color: "var(--muted)" }} />
                </div>
              )}
            </div>

            {/* Info básica */}
            <div className="bento p-5 space-y-3">
              {tecnico.recommended && (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                  style={{ background: "#DCFCE7", color: "#16A34A" }}
                >
                  <UserCheck className="h-3 w-3" /> Recomendado A&P
                </span>
              )}

              <div>
                <h1 className="text-xl font-black leading-tight" style={{ color: "var(--text)" }}>
                  {tecnico.title ? `${tecnico.title} ` : ""}{tecnico.name}
                </h1>
                {(tecnico.city || tecnico.neighborhood || tecnico.zone) && (
                  <p className="flex items-center gap-1 text-sm mt-1" style={{ color: "var(--muted)" }}>
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {[tecnico.city, tecnico.neighborhood].filter(Boolean).join(", ") || tecnico.zone}
                  </p>
                )}
              </div>

              {tecnico.rating > 0 && (
                <div className="space-y-0.5">
                  <StarRating value={tecnico.rating} />
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {tecnico.rating.toFixed(1)} · {tecnico.reviewCount} reseñas
                  </p>
                </div>
              )}

              {tecnico.specialties?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Especialidad
                  </p>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full inline-block"
                    style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                  >
                    {tecnico.specialties[0]}
                  </span>
                </div>
              )}

              {tecnico.yearsExperience > 0 && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
                  <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "var(--brand)" }} />
                  <span><strong>{tecnico.yearsExperience}+</strong> años de experiencia</span>
                </div>
              )}

              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "#25D366" }}
                >
                  <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">
                    <path d="M16.003 2.667C8.638 2.667 2.667 8.638 2.667 16c0 2.358.627 4.67 1.817 6.694L2.667 29.333l6.825-1.789A13.29 13.29 0 0016.003 29.333c7.365 0 13.33-5.97 13.33-13.333S23.368 2.667 16.003 2.667zm6.059 18.264c-.331-.167-1.96-.968-2.264-1.079-.305-.107-.527-.167-.748.166-.223.33-.86 1.079-1.054 1.3-.196.222-.39.248-.72.083-.331-.166-1.398-.515-2.663-1.643-.984-.878-1.648-1.962-1.843-2.293-.194-.33-.02-.51.146-.674.15-.149.33-.389.496-.583.167-.194.222-.332.333-.554.11-.222.055-.416-.028-.583-.083-.167-.748-1.803-1.025-2.47-.27-.648-.545-.56-.748-.57l-.637-.011c-.222 0-.582.083-.888.415-.305.33-1.164 1.137-1.164 2.773 0 1.637 1.192 3.218 1.358 3.44.167.222 2.346 3.584 5.685 5.027.795.343 1.415.547 1.899.7.798.253 1.525.217 2.099.132.64-.096 1.97-.806 2.247-1.584.278-.778.278-1.445.194-1.584-.083-.14-.305-.222-.637-.389z"/>
                  </svg>
                  Contactar por WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* ── Col derecha ── */}
          <div className="md:col-span-2 space-y-5">

            {/* Bio */}
            {tecnico.bio && (
              <div className="bento p-6">
                <h2 className="text-base font-bold mb-3 pb-2 border-b" style={{ color: "var(--text)", borderColor: "var(--border)" }}>
                  Resumen Profesional
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
                  {tecnico.bio}
                </p>
              </div>
            )}

            {/* Servicios */}
            {tecnico.services?.length > 0 && (
              <div className="bento p-6">
                <h2 className="text-base font-bold mb-4 pb-2 border-b" style={{ color: "var(--text)", borderColor: "var(--border)" }}>
                  Servicios Ofrecidos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tecnico.services.map((svc, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "var(--surface2)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                      >
                        <ServiceIcon name={svc.icon} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{svc.title}</p>
                        {svc.desc && (
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--muted)" }}>{svc.desc}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Galería */}
            {tecnico.recentWork?.length > 0 && (
              <div className="bento p-6">
                <h2 className="text-base font-bold mb-4 pb-2 border-b flex items-center justify-between" style={{ color: "var(--text)", borderColor: "var(--border)" }}>
                  Galería de Trabajos
                  <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>
                    {tecnico.recentWork.length} fotos
                  </span>
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {tecnico.recentWork.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(i)}
                      className="rounded-xl overflow-hidden block transition-all hover:scale-[1.02] hover:shadow-md"
                      style={{ aspectRatio: "1", background: "var(--surface2)" }}
                    >
                      <img
                        src={url}
                        alt={`Trabajo ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Especialidades adicionales */}
            {tecnico.specialties?.length > 1 && (
              <div className="bento p-5">
                <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text)" }}>
                  Todas las especialidades
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tecnico.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-sm px-3 py-1 rounded-full font-medium"
                      style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
