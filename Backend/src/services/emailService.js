import { Resend } from "resend";

// Se construye solo si hay clave: `new Resend(undefined)` LANZA al cargar el
// módulo, y como emailService se importa en el arranque, sin la variable el
// backend entero no levantaba. La guarda de sendMail (abajo) era inalcanzable.
// Así, si falta la clave el sitio funciona y solo se omiten los emails.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM || "A&P Refrigeración <noreply@refrigeracionayp.com>";

export async function sendMail({ to, subject, html }) {
  console.log(`[emailService] Enviando a ${to} | subject="${subject}"`);
  if (!resend) {
    console.warn("[emailService] RESEND_API_KEY no configurada — email omitido.");
    return { ok: false, reason: "no-credentials" };
  }
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[emailService] Error Resend:", JSON.stringify(error));
    return { ok: false, reason: error.message, code: error.name };
  }
  console.log(`[emailService] Enviado OK | id=${data.id}`);
  return { ok: true, id: data.id };
}

/**
 * El nombre y el motivo se interpolan en HTML. Sin escapar, alguien se registra
 * con un nombre que contiene un <a> y el sistema le manda un correo con un link
 * de phishing firmado con el DKIM del dominio de la tienda.
 */
const esc = (v = "") =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function approvalEmail(rawUserName, rawClientNumber) {
  const userName = esc(rawUserName);
  const clientNumber = esc(rawClientNumber);
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

export function passwordResetEmail(rawUserName, resetUrl) {
  const userName = esc(rawUserName);
  // resetUrl la arma el servidor con un token aleatorio, no viene del usuario.
  const url = esc(resetUrl);
  return {
    subject: "Restablecer tu contraseña — A&P Refrigeración",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
        <h2 style="color:#0033CC;margin-bottom:8px">Restablecer tu contraseña</h2>
        <p style="color:#374151">Hola ${userName}, recibimos un pedido para cambiar la contraseña de tu cuenta service.</p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:10px 24px;background:#0033CC;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Crear una contraseña nueva
        </a>
        <p style="color:#374151;margin-top:20px">El enlace vence en <strong>1 hora</strong> y se puede usar una sola vez.</p>
        <p style="color:#6B7280;font-size:13px">Si no pediste este cambio, ignorá este correo: tu contraseña sigue siendo la misma.</p>
        <p style="margin-top:24px;font-size:12px;color:#9CA3AF">A&P Refrigeración — Buenos Aires, Argentina</p>
      </div>`,
  };
}

export function rejectionEmail(rawUserName, rawReason) {
  const userName = esc(rawUserName);
  const reason = esc(rawReason);
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
