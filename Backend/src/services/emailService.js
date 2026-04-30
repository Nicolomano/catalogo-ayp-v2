import nodemailer from "nodemailer";
import dns from "node:dns";
import { promises as dnsPromises } from "node:dns";
import config from "../config/config.js";

// Redundancia: si por orden de imports app.js no llegó a setearlo,
// nos aseguramos acá también de resolver primero IPv4.
dns.setDefaultResultOrder("ipv4first");

const SMTP_HOST = "smtp.gmail.com";
let cachedHost = null;
let cachedHostExpiresAt = 0;

// Resuelve smtp.gmail.com SOLO a IPv4 (resolve4 nunca devuelve AAAA).
// Cachea por 5 minutos para no martillar DNS.
async function resolveSmtpHostIPv4() {
  const now = Date.now();
  if (cachedHost && now < cachedHostExpiresAt) return cachedHost;
  try {
    const addresses = await dnsPromises.resolve4(SMTP_HOST);
    if (addresses?.length) {
      cachedHost = addresses[0];
      cachedHostExpiresAt = now + 5 * 60 * 1000;
      console.log(`[emailService] Resuelto ${SMTP_HOST} -> ${cachedHost} (IPv4)`);
      return cachedHost;
    }
  } catch (e) {
    console.warn(`[emailService] No pude resolver IPv4 de ${SMTP_HOST}: ${e.message}. Uso hostname directo.`);
  }
  return SMTP_HOST;
}

function buildTransporter(host) {
  return nodemailer.createTransport({
    host,
    port: 465,
    secure: true,
    family: 4,
    auth: {
      user: config.emailAccount,
      pass: config.emailPassword,
    },
    // SNI debe seguir siendo el hostname real para que el cert TLS valide.
    tls: { servername: SMTP_HOST },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/**
 * Envía un email. Si las credenciales no están configuradas, loguea y sigue.
 */
export async function sendMail({ to, subject, html }) {
  console.log(`[emailService] Intentando enviar a ${to} | subject="${subject}"`);
  if (!config.emailAccount || !config.emailPassword) {
    console.warn("[emailService] Credenciales de Gmail NO configuradas, email omitido. " +
      `(GMAIL_ACCOUNT=${config.emailAccount ? "SET" : "MISSING"}, ` +
      `GMAIL_PASSWORD=${config.emailPassword ? "SET" : "MISSING"})`);
    return { ok: false, reason: "no-credentials" };
  }
  try {
    const host = await resolveSmtpHostIPv4();
    const transporter = buildTransporter(host);
    const info = await transporter.sendMail({
      from: `"A&P Refrigeración" <${config.emailAccount}>`,
      to,
      subject,
      html,
    });
    console.log(`[emailService] Enviado OK a ${to} via ${host} | messageId=${info.messageId} | accepted=${info.accepted?.join(",")} | rejected=${info.rejected?.join(",")}`);
    return { ok: true, host, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (err) {
    console.error(`[emailService] Error enviando a ${to}:`, err.message, err.code || "", err.response || "");
    // Invalidar cache de host por si la IP quedó muerta
    cachedHost = null;
    cachedHostExpiresAt = 0;
    return { ok: false, reason: err.message, code: err.code };
  }
}

export function approvalEmail(userName, clientNumber) {
  return {
    subject: "¡Tu cuenta fue aprobada! — A&P Refrigeración",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#0033CC;margin-bottom:8px">¡Bienvenido, ${userName}!</h2>
        <p style="color:#374151">Tu cuenta de <strong>Precio Service</strong> en A&P Refrigeración fue <strong style="color:#16A34A">aprobada</strong>.</p>
        ${clientNumber ? `<p style="color:#374151">Tu <strong>número de cliente</strong> es: <span style="font-size:1.2em;font-weight:700;color:#0033CC">${clientNumber}</span>. Guardalo para futuras consultas.</p>` : ""}
        <p style="color:#374151">A partir de ahora podés iniciar sesión y acceder a los precios especiales para técnicos matriculados.</p>
        <a href="https://www.refrigeracionayp.com/login"
           style="display:inline-block;margin-top:16px;padding:10px 24px;background:#0033CC;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Iniciar sesión
        </a>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF">A&P Refrigeración — Buenos Aires, Argentina</p>
      </div>`,
  };
}

export function rejectionEmail(userName, reason) {
  return {
    subject: "Actualización sobre tu solicitud — A&P Refrigeración",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#DC2626;margin-bottom:8px">Solicitud no aprobada</h2>
        <p style="color:#374151">Hola ${userName}, lamentablemente tu solicitud de cuenta service no pudo ser aprobada en este momento.</p>
        ${reason ? `<p style="color:#374151"><strong>Motivo:</strong> ${reason}</p>` : ""}
        <p style="color:#374151">Si tenés dudas, escribinos por WhatsApp o email y lo resolvemos.</p>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF">A&P Refrigeración — Buenos Aires, Argentina</p>
      </div>`,
  };
}
