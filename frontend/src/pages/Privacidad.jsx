import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ShieldCheck } from "lucide-react";
import API from "../api/axios";

// Política de Privacidad — plantilla base que refleja los datos que el sistema
// efectivamente maneja. Conviene que la revise un abogado antes de considerarla
// definitiva. Los datos de contacto se toman de la configuración del sitio.
export default function Privacidad() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    API.get("/site-config").then((r) => setCfg(r.data)).catch(() => setCfg({}));
  }, []);

  const email = cfg?.email || "";
  const phone = cfg?.phone || "";
  const address = cfg?.address || "";
  const hasAddress = address && !/direcci[oó]n del local/i.test(address);
  const updated = "septiembre de 2026";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <Helmet>
        <title>Política de Privacidad · A&P Refrigeración</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <header>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-3"
          style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Tus datos
        </span>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Política de Privacidad
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Última actualización: {updated}
        </p>
      </header>

      <div className="space-y-7 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
        <Section title="1. Quiénes somos">
          <p>
            Este sitio pertenece a <strong>A&P Refrigeración</strong>, distribuidora de
            repuestos y equipos de refrigeración comercial e industrial ubicada en Los
            Polvorines, provincia de Buenos Aires, Argentina. Somos responsables del
            tratamiento de los datos personales que se recopilan a través del sitio.
          </p>
        </Section>

        <Section title="2. Qué datos recopilamos">
          <p>Recopilamos únicamente los datos que vos nos proporcionás y los necesarios para el funcionamiento del sitio:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Al hacer un pedido:</strong> nombre y teléfono, junto con el detalle de
              los productos solicitados. El pedido se coordina y finaliza por WhatsApp.
            </li>
            <li>
              <strong>Al registrarte como técnico/service:</strong> nombre, email, teléfono,
              provincia, CUIT y, si corresponde, una imagen de tu matrícula, para validar el
              acceso al precio diferencial.
            </li>
            <li>
              <strong>Datos técnicos de navegación:</strong> de forma automática, información
              como tu dirección IP, tipo de dispositivo y navegador, y páginas visitadas, a
              través de cookies y herramientas de analítica.
            </li>
          </ul>
        </Section>

        <Section title="3. Para qué usamos tus datos">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Procesar y coordinar tus pedidos y consultas.</li>
            <li>Validar el registro de técnicos y habilitar el precio service.</li>
            <li>Comunicarnos con vos respecto de tu pedido o tu cuenta.</li>
            <li>Entender el uso del sitio y mejorar su funcionamiento.</li>
          </ul>
          <p className="mt-2">
            No vendemos ni alquilamos tus datos personales a terceros con fines comerciales.
          </p>
        </Section>

        <Section title="4. Cookies y tecnologías similares">
          <p>
            Utilizamos cookies y almacenamiento local del navegador (localStorage) para el
            funcionamiento del sitio —por ejemplo, mantener tu sesión, el carrito y tus
            preferencias— y para analítica mediante Google Analytics, que nos permite medir
            de forma agregada cómo se usa el sitio. Podés bloquear o eliminar las cookies
            desde la configuración de tu navegador; algunas funciones podrían dejar de
            funcionar correctamente.
          </p>
        </Section>

        <Section title="5. Con quién compartimos datos">
          <p>Para prestar el servicio nos apoyamos en proveedores que pueden procesar ciertos datos por nuestra cuenta:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>WhatsApp (Meta):</strong> canal para coordinar y finalizar los pedidos.</li>
            <li><strong>Google Analytics (Google):</strong> métricas de uso del sitio.</li>
            <li><strong>Proveedores de infraestructura:</strong> alojamiento del sitio, la base de datos y el almacenamiento de imágenes (por ejemplo, servicios de nube como Vercel, Railway, MongoDB Atlas y Cloudflare R2).</li>
          </ul>
          <p className="mt-2">
            Algunos de estos proveedores pueden almacenar información en servidores fuera de
            la Argentina. En esos casos procuramos que existan resguardos adecuados para la
            protección de tus datos.
          </p>
        </Section>

        <Section title="6. Conservación de los datos">
          <p>
            Conservamos tus datos mientras sean necesarios para las finalidades descriptas o
            mientras mantengas una cuenta activa, y luego durante el plazo que exijan las
            obligaciones legales aplicables. Podés solicitar la eliminación de tu cuenta en
            cualquier momento.
          </p>
        </Section>

        <Section title="7. Tus derechos">
          <p>
            De acuerdo con la Ley N° 25.326 de Protección de los Datos Personales, tenés
            derecho a acceder, rectificar, actualizar y suprimir tus datos personales.
            Para ejercerlos, escribinos por los canales de contacto que figuran más abajo.
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, órgano de control de la Ley N°
            25.326, tiene la atribución de atender denuncias y reclamos respecto del
            incumplimiento de las normas sobre protección de datos personales.
          </p>
        </Section>

        <Section title="8. Menores de edad">
          <p>
            El sitio está dirigido a técnicos, comercios y público mayor de edad. No
            recopilamos de forma intencional datos de menores.
          </p>
        </Section>

        <Section title="9. Cambios en esta política">
          <p>
            Podemos actualizar esta política para reflejar cambios en el sitio o en la
            normativa. Publicaremos la versión vigente en esta misma página con su fecha de
            actualización.
          </p>
        </Section>

        <Section title="10. Contacto">
          <p>Ante cualquier duda o para ejercer tus derechos, podés contactarnos:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            {email && (
              <li>
                Email:{" "}
                <a href={`mailto:${email}`} className="font-semibold hover:underline" style={{ color: "var(--brand)" }}>
                  {email}
                </a>
              </li>
            )}
            {phone && !/x{2,}/i.test(phone) && (
              <li>Teléfono: <strong>{phone}</strong></li>
            )}
            {hasAddress && <li>Dirección: <strong>{address}</strong></li>}
            <li>
              O por WhatsApp desde la sección{" "}
              <a href="/contacto" className="font-semibold hover:underline" style={{ color: "var(--brand)" }}>
                Contacto
              </a>
              .
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>{title}</h2>
      {children}
    </section>
  );
}
