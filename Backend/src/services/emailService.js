import nodemailer from "nodemailer";
import dns from "node:dns";
import config from "../config/config.js";

// Redundancia: si por orden de imports app.js no llegó a setearlo,
// nos aseguramos acá también de resolver primero IPv4.
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4, // forzar IPv4 — Railway no tiene conectividad IPv6 saliente
  auth: {
    user: config.emailAccount,
    pass: config.emailPassword,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

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
    const info = await transporter.sendMail({
      from: `"A&P Refrigeración" <${config.emailAccount}>`,
      to,
      subject,
      html,
    });
    console.log(`[emailService] Enviado OK a ${to} | messageId=${info.messageId} | accepted=${info.accepted?.join(",")} | rejected=${info.rejected?.join(",")}`);
    return { ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (err) {
    console.error(`[emailService] Error enviando a ${to}:`, err.message, err.code || "", err.response || "");
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
