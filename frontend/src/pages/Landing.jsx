import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronRight, Wrench, Phone, MapPin, Clock, Zap } from "lucide-react";
import API from "../api/axios";
import HeroCarousel from "../components/HeroCarousel.jsx";

/* Íconos fijos para las 4 tarjetas de info */
const INFO_ICONS = [
  <Zap className="h-5 w-5" />,
  <Phone className="h-5 w-5" />,
  <Wrench className="h-5 w-5" />,
  <Clock className="h-5 w-5" />,
];

const DEFAULT_CONFIG = {
  infoCards: [
    { title: "Envíos rápidos",  desc: "A todo el país" },
    { title: "WhatsApp",        desc: "Cotizá al instante" },
    { title: "Precio service",  desc: "10% de descuento" },
    { title: "Horario",         desc: "Lun-Vie 8 a 18hs" },
  ],
  aboutTitle:  "¿Quiénes somos?",
  aboutText:   "A&P Refrigeración es un distribuidor mayorista de repuestos y equipos de refrigeración comercial e industrial. Más de 10 años en el rubro, atendiendo a instaladores y técnicos de todo el país.",
  address:     "Dirección del local, Ciudad, Provincia",
  phone:       "+54 11 XXXX-XXXX",
  hours:       "Lunes a Viernes de 8:00 a 18:00hs",
  kitTitle:    "Kit de instalación",
  kitSubtitle: "Calculá todo lo que necesitás para una instalación completa. Seleccioná los componentes y armá tu pedido en minutos.",
  kitCTA:      "Armar mi kit →",
};

function ProductCard({ product }) {
  return (
    <Link
      to={`/product/${product.productCode}`}
      className="bento flex flex-col hover:shadow-lg transition group"
    >
      <div
        className="aspect-square flex items-center justify-center p-4 rounded-t-[20px]"
        style={{ background: "var(--surface2)" }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="object-contain max-h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="text-4xl opacity-20">📦</div>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
          {product.brand || ""}
        </p>
        <h3 className="text-sm font-semibold line-clamp-2 flex-1" style={{ color: "var(--text)" }}>
          {product.name}
        </h3>
        {product.priceARS ? (
          <p className="text-base font-bold mt-2" style={{ color: "var(--brand)" }}>
            ${product.priceARS.toLocaleString("es-AR")}
          </p>
        ) : (
          <p className="text-sm italic mt-2" style={{ color: "var(--muted)" }}>Consultar precio</p>
        )}
      </div>
    </Link>
  );
}

function SectionHeader({ tag, title, linkTo, linkLabel }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        {tag && (
          <span
            className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md inline-block mb-2"
            style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
          >
            {tag}
          </span>
        )}
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>{title}</h2>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--brand)" }}
        >
          {linkLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function Landing() {
  const [landingData, setLandingData] = useState({ featured: [], newArrivals: [] });
  const [categories, setCategories]   = useState([]);
  const [siteConfig, setSiteConfig]   = useState(DEFAULT_CONFIG);
  // null = cargando (evita parpadeo), [] = sin banners, [...] = hay banners
  const [banners, setBanners]         = useState(null);

  useEffect(() => {
    API.get("/products/landing")
      .then((r) => setLandingData({
        featured:    Array.isArray(r.data?.featured)    ? r.data.featured    : [],
        newArrivals: Array.isArray(r.data?.newArrivals) ? r.data.newArrivals : [],
      }))
      .catch(() => {});
    API.get("/products/meta/categories")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        const norm = data.length && typeof data[0] === "string"
          ? data.map((c) => ({ category: c, subcategories: [] }))
          : data;
        setCategories(norm.slice(0, 7));
      })
      .catch(() => {});
    API.get("/site-config")
      .then((r) => setSiteConfig((prev) => ({ ...prev, ...r.data })))
      .catch(() => {});
    API.get("/banners?type=home")
      .then((r) => setBanners(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBanners([]));
  }, []);

  const { featured, newArrivals } = landingData;

  return (
    <>
      <Helmet>
        <title>A&P Refrigeración — Repuestos y equipos de refrigeración</title>
        <meta name="description" content="Catálogo A&P Refrigeración: productos y repuestos de refrigeración comercial e industrial." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-14">

        {/* ── HERO BENTO GRID ── */}
        <section>
          <div className="grid grid-cols-12 gap-4" style={{ gridAutoRows: "160px" }}>

            {/* Hero principal — 8 cols, 2 rows */}
            <div
              className="col-span-12 md:col-span-8 row-span-2 rounded-3xl p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: siteConfig.heroImage
                  ? `linear-gradient(rgba(0,26,128,0.78), rgba(0,51,204,0.72)), url(${siteConfig.heroImage}) center/cover`
                  : "var(--hero-grad)"
              }}
            >
              {!siteConfig.heroImage && (
                <>
                  <div className="absolute right-0 bottom-0 w-72 h-72 opacity-10 pointer-events-none">
                    <svg viewBox="0 0 400 400" fill="none">
                      <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="0.5"/>
                      <circle cx="200" cy="200" r="120" stroke="white" strokeWidth="0.5"/>
                      <circle cx="200" cy="200" r="60"  stroke="white" strokeWidth="0.5"/>
                      <line x1="20" y1="200" x2="380" y2="200" stroke="white" strokeWidth="0.5"/>
                      <line x1="200" y1="20"  x2="200" y2="380" stroke="white" strokeWidth="0.5"/>
                    </svg>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
                    style={{ background: "radial-gradient(circle at top right, rgba(150,180,255,0.18) 0%, transparent 60%)" }}
                  />
                </>
              )}

              <div className="relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-4 border border-white/15 text-white/60"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  {siteConfig.heroBadge}
                </span>
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-3">
                  {siteConfig.heroTitle}<br/>
                  <span style={{ color: "#99BBFF" }}>{siteConfig.heroHighlight}</span>
                </h1>
                <p className="text-white/60 text-sm sm:text-base max-w-sm leading-relaxed">
                  {siteConfig.heroSubtitle}
                </p>
              </div>

              <div className="relative z-10 flex gap-3 flex-wrap">
                <Link to="/catalogo"
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-slate-50 transition-colors"
                  style={{ color: "#001A80" }}>
                  {siteConfig.heroCTA1}
                </Link>
                <Link to="/register"
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/20 text-white/80 hover:border-white/40 hover:text-white transition-colors">
                  {siteConfig.heroCTA2}
                </Link>
              </div>
            </div>

            {/* Columna derecha: carousel si hay banners, stat cards si no */}
            {banners?.length
              ? (
                /* Carousel integrado — ocupa las 2 filas de la columna derecha */
                <div className="col-span-12 md:col-span-4 row-span-2 overflow-hidden rounded-[20px]">
                  <HeroCarousel slides={banners} fillContainer />
                </div>
              ) : banners !== null && (
                /* Stat cards — solo se muestran cuando se confirmó que no hay banners */
                <>
                  <div className="col-span-6 md:col-span-4 row-span-1 bento p-5 sm:p-6 flex flex-col justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                      {siteConfig.stat1Title}
                    </p>
                    <div>
                      <p className="text-4xl font-black leading-none" style={{ color: "var(--text)" }}>
                        {siteConfig.stat1Value}
                      </p>
                      <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{siteConfig.stat1Label}</p>
                    </div>
                  </div>

                  <div
                    className="col-span-6 md:col-span-4 row-span-1 rounded-[20px] p-5 sm:p-6 flex flex-col justify-between border"
                    style={{ background: "var(--dark-card)", borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(153,187,255,0.6)" }}>
                      {siteConfig.stat2Title}
                    </p>
                    <div>
                      <p className="text-4xl font-black leading-none text-white">
                        {siteConfig.stat2Value}
                      </p>
                      <p className="text-sm mt-1 text-white/40">{siteConfig.stat2Label}</p>
                    </div>
                  </div>
                </>
              )
            }

          </div>
        </section>

        {/* ── INFO CARDS ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Array.isArray(siteConfig.infoCards) ? siteConfig.infoCards : []).map((card, i) => (
            <div key={i} className="bento p-5 flex flex-col items-center text-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
              >
                {INFO_ICONS[i]}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{card.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{card.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ── CATEGORÍAS ── */}
        {categories.length > 0 && (
          <section>
            <SectionHeader tag="Categorías" title="Navegá por categoría" linkTo="/catalogo" linkLabel="Ver todas" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.category}
                  to={`/catalogo?cat=${encodeURIComponent(cat.category)}`}
                  className="bento p-4 flex items-center gap-3 group"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: "var(--brand-tint)" }}
                  >
                    🔧
                  </div>
                  <span className="text-sm font-medium group-hover:underline" style={{ color: "var(--text)" }}>
                    {cat.category}
                  </span>
                </Link>
              ))}
              <Link
                to="/catalogo"
                className="rounded-[20px] border-2 border-dashed flex flex-col items-center justify-center gap-1 py-4 transition-colors"
                style={{ borderColor: "var(--brand-tint)", color: "var(--muted)" }}
              >
                <span className="text-2xl font-black" style={{ color: "var(--brand)" }}>+</span>
                <span className="text-xs">Ver todas</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── PRODUCTOS DESTACADOS ── */}
        {featured.length > 0 && (
          <section style={{ background: "var(--surface)", borderRadius: "24px", padding: "28px" }}>
            <SectionHeader tag="Destacados" title="Más vendidos" linkTo="/catalogo" linkLabel="Ver todos" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featured.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── NUEVOS INGRESOS ── */}
        {newArrivals.length > 0 && (
          <section>
            <SectionHeader tag="Nuevos ingresos" title="Últimas novedades" linkTo="/catalogo?sort=createdAt:desc" linkLabel="Ver todos" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {newArrivals.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}

        {/* ── CTAs DOBLES ── */}
        <section className="grid md:grid-cols-2 gap-4">

          {/* Kit de instalación */}
          <div
            className="rounded-3xl p-8 sm:p-10 flex flex-col justify-between"
            style={{ background: "var(--hero-grad)", minHeight: "220px" }}
          >
            <div>
              <span
                className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full inline-block mb-4 border border-white/10"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                Kit completo
              </span>
              <h2 className="text-2xl font-bold text-white mb-2">{siteConfig.kitTitle}</h2>
              <p className="text-white/60 text-sm leading-relaxed">{siteConfig.kitSubtitle}</p>
            </div>
            <Link
              to="/kit-instalacion"
              className="mt-6 self-start px-6 py-2.5 rounded-xl font-semibold text-sm bg-white hover:bg-slate-50 transition-colors"
              style={{ color: "#001A80" }}
            >
              {siteConfig.kitCTA}
            </Link>
          </div>

          {/* Quiénes somos + contacto */}
          <div className="bento p-8 sm:p-10 flex flex-col justify-between" style={{ minHeight: "220px" }}>
            <div>
              <span
                className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md inline-block mb-4"
                style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
              >
                Sobre nosotros
              </span>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>{siteConfig.aboutTitle}</h2>
              <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--muted)" }}>
                {siteConfig.aboutText}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {siteConfig.address && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                  <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: "var(--brand)" }} />
                  {siteConfig.address}
                </div>
              )}
              {siteConfig.phone && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                  <Phone className="h-4 w-4 flex-shrink-0" style={{ color: "var(--brand)" }} />
                  {siteConfig.phone}
                </div>
              )}
              {siteConfig.hours && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                  <Clock className="h-4 w-4 flex-shrink-0" style={{ color: "var(--brand)" }} />
                  {siteConfig.hours}
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

export default Landing;
