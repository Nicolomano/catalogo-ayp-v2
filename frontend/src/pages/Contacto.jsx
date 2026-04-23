import { useEffect, useState } from "react";
import API from "../api/axios";

const FALLBACK = {
  phone:     "+5491168815837",
  phoneFmt:  "+54 9 11 6881-5837",
  whatsapp:  "5491168815837",
  address:   "Av. Sesquicentenario 2144, Los Polvorines, Buenos Aires",
  hours:     "Lunes a Viernes de 8:00 a 18:00hs",
  email:     "",
  mapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1805.392754035019!2d-58.70720023760755!3d-34.49696692198153!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bca36c372e2b0d%3A0x5aa0aed941af813a!2sRefrigeraci%C3%B3n%20A%26P!5e0!3m2!1ses-419!2sar!4v1760707801941!5m2!1ses-419!2sar",
};

const WA_MSG = "Hola! Quisiera consultar por un producto del catálogo.";

export default function Contacto() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    API.get("/site-config")
      .then((r) => setCfg(r.data))
      .catch(() => setCfg({}));
  }, []);

  const phone     = cfg?.phone     || FALLBACK.phone;
  const phoneFmt  = cfg?.phone     || FALLBACK.phoneFmt;
  const whatsapp  = (cfg?.whatsapp || FALLBACK.whatsapp).replace(/\D/g, "");
  const address   = cfg?.address   || FALLBACK.address;
  const hours     = cfg?.hours     || FALLBACK.hours;
  const email     = cfg?.email     || FALLBACK.email;
  const mapsEmbed = cfg?.mapsEmbed || FALLBACK.mapsEmbed;

  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(WA_MSG)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Contacto</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Consultá por productos, precios o envíos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Datos de contacto */}
        <section className="bento p-6 space-y-5">
          <h2 className="text-base font-bold pb-2 border-b"
            style={{ color: "var(--text)", borderColor: "var(--border)" }}>
            Hablemos
          </h2>

          <div className="space-y-4">
            {/* Teléfono */}
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--surface2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" style={{ color: "var(--brand)" }}>
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Teléfono</p>
                <a href={`tel:${phone.replace(/\s/g, "")}`}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--brand)" }}>
                  {phoneFmt}
                </a>
              </div>
            </div>

            {/* WhatsApp */}
            {whatsapp && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(37,211,102,0.1)" }}>
                  <svg viewBox="0 0 32 32" width="16" height="16" fill="#25D366">
                    <path d="M16.003 2.667C8.638 2.667 2.667 8.638 2.667 16c0 2.358.627 4.67 1.817 6.694L2.667 29.333l6.825-1.789A13.29 13.29 0 0016.003 29.333c7.365 0 13.33-5.97 13.33-13.333S23.368 2.667 16.003 2.667zm6.059 18.264c-.331-.167-1.96-.968-2.264-1.079-.305-.107-.527-.167-.748.166-.223.33-.86 1.079-1.054 1.3-.196.222-.39.248-.72.083-.331-.166-1.398-.515-2.663-1.643-.984-.878-1.648-1.962-1.843-2.293-.194-.33-.02-.51.146-.674.15-.149.33-.389.496-.583.167-.194.222-.332.333-.554.11-.222.055-.416-.028-.583-.083-.167-.748-1.803-1.025-2.47-.27-.648-.545-.56-.748-.57l-.637-.011c-.222 0-.582.083-.888.415-.305.33-1.164 1.137-1.164 2.773 0 1.637 1.192 3.218 1.358 3.44.167.222 2.346 3.584 5.685 5.027.795.343 1.415.547 1.899.7.798.253 1.525.217 2.099.132.64-.096 1.97-.806 2.247-1.584.278-.778.278-1.445.194-1.584-.083-.14-.305-.222-.637-.389z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>WhatsApp</p>
                  <a href={waHref} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl text-white transition-colors"
                    style={{ background: "#25D366" }}>
                    Escribir por WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Email */}
            {email && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface2)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" style={{ color: "var(--brand)" }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Email</p>
                  <a href={`mailto:${email}`}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: "var(--brand)" }}>
                    {email}
                  </a>
                </div>
              </div>
            )}

            {/* Dirección */}
            {address && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface2)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" style={{ color: "var(--brand)" }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Dirección</p>
                  <p className="text-sm" style={{ color: "var(--text)" }}>{address}</p>
                </div>
              </div>
            )}

            {/* Horario */}
            {hours && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--surface2)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" style={{ color: "var(--brand)" }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: "var(--muted)" }}>Horario</p>
                  <p className="text-sm" style={{ color: "var(--text)" }}>{hours}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mapa */}
        {mapsEmbed && (
          <section className="bento overflow-hidden" style={{ minHeight: "300px" }}>
            <iframe
              src={mapsEmbed}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0"
              style={{ minHeight: "300px" }}
              title="Ubicación A&P Refrigeración"
            />
          </section>
        )}
      </div>
    </div>
  );
}
